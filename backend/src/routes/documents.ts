import fs from "node:fs";
import path from "node:path";

import multer from "multer";
import { Router } from "express";
import { z } from "zod";

import type { ClientSessionPayload } from "../lib/jwt";
import { verifyAgentSession, verifyClientSession } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { requireAgentAuth } from "../middleware/agentAuth";
import { runDocumentPipeline } from "../services/documents/pipeline";
import { mapDocumentRecord, resolveDocumentAbsolutePath } from "../services/documents/repository";
import { validateMagicLinkPortalToken } from "../services/magicLink";
import { emitRealtimeEvent } from "../services/sync/realtime";

const router = Router();

const documentCategoryValues = [
  "purchase_agreement",
  "inspection_report",
  "disclosure",
  "hoa",
  "generic"
] as const;

const uploadBodySchema = z.object({
  transactionId: z.string().min(1),
  title: z.string().trim().min(3).max(160),
  category: z.enum(documentCategoryValues)
});

const overrideBodySchema = z.object({
  summaryTlDr: z.string().trim().min(12).max(240),
  whatThisIs: z.string().trim().min(20),
  watchFor: z.array(z.string().trim().min(6)).min(3),
  askYourAgent: z.array(z.string().trim().min(6)).min(3),
  plainEnglishFullText: z.string().trim().min(40)
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

function getAccessTokenFromRequest(
  request: import("express").Request
): string | null {
  const authorizationHeader = request.header("authorization");
  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.slice("Bearer ".length);
  }

  const tokenQueryValue = request.query["token"];
  return typeof tokenQueryValue === "string" ? tokenQueryValue : null;
}

interface DocumentAccessContext {
  type: "agent" | "client";
  agentId?: string;
  clientSession?: ClientSessionPayload;
}

async function resolveDocumentAccessContext(
  request: import("express").Request
): Promise<DocumentAccessContext | null> {
  const token = getAccessTokenFromRequest(request);
  if (!token) {
    return null;
  }

  const agentSession = verifyAgentSession(token);
  if (agentSession) {
    return {
      type: "agent",
      agentId: agentSession.agentId
    };
  }

  const clientSession = verifyClientSession(token);
  if (clientSession) {
    return {
      type: "client",
      clientSession
    };
  }

  const magicLinkAccess = await validateMagicLinkPortalToken(token);
  if (magicLinkAccess) {
    return {
      type: "client",
      clientSession: magicLinkAccess.session
    };
  }

  return null;
}

router.post("/upload", requireAgentAuth, upload.single("file"), async (request, response) => {
  const parsedBody = uploadBodySchema.safeParse(request.body);
  if (!parsedBody.success) {
    response.status(400).json({
      message: "Invalid upload payload.",
      issues: parsedBody.error.flatten()
    });
    return;
  }

  const file = request.file;
  if (!file) {
    response.status(400).json({ message: "A PDF file is required." });
    return;
  }

  const isPdf =
    file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    response.status(400).json({ message: "Only PDF uploads are supported." });
    return;
  }

  const agentId = request.agent?.agentId;
  if (!agentId) {
    response.status(401).json({ message: "Missing agent session." });
    return;
  }

  const document = await runDocumentPipeline({
    transactionId: parsedBody.data.transactionId,
    agentId,
    title: parsedBody.data.title,
    category: parsedBody.data.category,
    originalFilename: file.originalname,
    fileBuffer: file.buffer
  });

  response.status(201).json({
    document
  });
});

router.post("/:id/override", requireAgentAuth, async (request, response) => {
  const parsedBody = overrideBodySchema.safeParse(request.body);
  if (!parsedBody.success) {
    response.status(400).json({
      message: "Invalid override payload.",
      issues: parsedBody.error.flatten()
    });
    return;
  }

  const agentId = request.agent?.agentId;
  if (!agentId) {
    response.status(401).json({ message: "Missing agent session." });
    return;
  }

  const documentId = request.params["id"];
  if (typeof documentId !== "string") {
    response.status(400).json({ message: "Invalid document id." });
    return;
  }

  const existingDocument = await prisma.documentRecord.findFirst({
    where: {
      id: documentId,
      transaction: {
        agentId
      }
    },
    include: {
      transaction: {
        select: {
          propertyAddress: true,
          stageLabel: true,
          clientRoles: {
            select: {
              clientAccountId: true
            }
          }
        }
      }
    }
  });

  if (!existingDocument) {
    response.status(404).json({ message: "Document not found for this agent." });
    return;
  }

  const updatedDocument = await prisma.documentRecord.update({
    where: {
      id: existingDocument.id
    },
    data: {
      summaryTlDr: parsedBody.data.summaryTlDr,
      summaryJson: JSON.stringify({
        whatThisIs: parsedBody.data.whatThisIs,
        watchFor: parsedBody.data.watchFor.slice(0, 3),
        askYourAgent: parsedBody.data.askYourAgent.slice(0, 3),
        plainEnglishFullText: parsedBody.data.plainEnglishFullText
      }),
      overriddenAt: new Date(),
      overriddenBy: agentId
    },
    include: {
      transaction: {
        select: {
          propertyAddress: true,
          stageLabel: true
        }
      }
    }
  });

  for (const clientRole of existingDocument.transaction.clientRoles) {
    emitRealtimeEvent("agent:override", {
      agentId,
      transactionId: existingDocument.transactionId,
      clientAccountId: clientRole.clientAccountId,
      documentId: existingDocument.id
    });
  }

  response.json({
    document: mapDocumentRecord(updatedDocument)
  });
});

router.get("/:id/file", async (request, response) => {
  const accessContext = await resolveDocumentAccessContext(request);
  if (!accessContext) {
    response.status(401).json({ message: "Missing or invalid access token." });
    return;
  }

  const documentId = request.params["id"];
  if (typeof documentId !== "string") {
    response.status(400).json({ message: "Invalid document id." });
    return;
  }

  const document = await prisma.documentRecord.findUnique({
    where: {
      id: documentId
    },
    include: {
      transaction: {
        include: {
          agent: true
        }
      }
    }
  });

  if (!document) {
    response.status(404).json({ message: "Document not found." });
    return;
  }

  const hasAccess =
    accessContext.type === "agent"
      ? document.transaction.agentId === accessContext.agentId
      : Boolean(accessContext.clientSession?.accessibleTransactionIds.includes(document.transactionId));

  if (!hasAccess) {
    response.status(403).json({ message: "You do not have access to this document." });
    return;
  }

  if (accessContext.type === "client" && !document.openedByClient && accessContext.clientSession) {
    await prisma.documentRecord.update({
      where: {
        id: document.id
      },
      data: {
        openedByClient: true,
        openedAt: new Date()
      }
    });

    await prisma.notification.create({
      data: {
        agentId: document.transaction.agentId,
        type: "document_opened",
        title: `${document.title} was opened`,
        body: `A client opened ${document.title} in the portal.`,
        relatedId: document.id
      }
    });

    emitRealtimeEvent("client:document_opened", {
      agentId: document.transaction.agentId,
      transactionId: document.transactionId,
      clientAccountId: accessContext.clientSession.clientAccountId,
      documentId: document.id
    });
  }

  const absolutePath = resolveDocumentAbsolutePath(document.filePath);
  if (!fs.existsSync(absolutePath)) {
    response.status(404).json({ message: "Stored file could not be found on disk." });
    return;
  }

  response.setHeader("Content-Type", "application/pdf");
  response.setHeader(
    "Content-Disposition",
    `inline; filename="${path.basename(document.filePath).replace(/"/g, "")}"`
  );
  response.sendFile(absolutePath);
});

export { router as documentsRouter };
