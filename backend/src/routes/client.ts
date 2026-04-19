import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma";
import { requireClientAuth } from "../middleware/clientAuth";
import { askTransactionQuestion, submitTransactionCheckIn } from "../services/clientPortal/engagement";
import {
  mapQuestionRecord,
  mapReadinessSnapshot,
  mapSentimentEntry
} from "../services/clientPortal/repository";
import { mapDocumentRecord } from "../services/documents/repository";
import { emitRealtimeEvent } from "../services/sync/realtime";

const router = Router();

const askQuestionSchema = z.object({
  question: z.string().trim().min(4).max(1_200),
  documentId: z.string().min(1).optional()
});

const checkInSchema = z.object({
  response: z.string().trim().min(3).max(600)
});

router.get("/portfolio", requireClientAuth, async (request, response) => {
  const clientSession = request.clientSession;
  if (!clientSession) {
    response.status(401).json({ message: "Missing client session." });
    return;
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      id: {
        in: clientSession.accessibleTransactionIds
      }
    },
    include: {
      clientRoles: {
        where: {
          clientAccountId: clientSession.clientAccountId
        }
      },
      documents: true,
      readiness: {
        where: {
          clientAccountId: clientSession.clientAccountId
        },
        orderBy: {
          computedAt: "desc"
        },
        take: 1
      }
    },
    orderBy: [
      {
        closedAt: "desc"
      },
      {
        expectedCloseAt: "asc"
      }
    ]
  });

  response.json({
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      role: transaction.role,
      propertyAddress: transaction.propertyAddress,
      propertyCity: transaction.propertyCity,
      propertyState: transaction.propertyState,
      propertyZip: transaction.propertyZip,
      propertyPrice: transaction.propertyPrice ?? undefined,
      stage: transaction.stage,
      stageLabel: transaction.stageLabel,
      expectedCloseAt: transaction.expectedCloseAt?.toISOString(),
      closedAt: transaction.closedAt?.toISOString(),
      relationshipRole: transaction.clientRoles[0]?.role ?? "client",
      documentCount: transaction.documents.length,
      readinessBucket: transaction.readiness[0]?.bucket ?? undefined
    }))
  });
});

router.get("/transactions/:id/documents", requireClientAuth, async (request, response) => {
  const clientSession = request.clientSession;
  const transactionId = request.params["id"];

  if (!clientSession) {
    response.status(401).json({ message: "Missing client session." });
    return;
  }

  if (typeof transactionId !== "string") {
    response.status(400).json({ message: "Invalid transaction id." });
    return;
  }

  if (!clientSession.accessibleTransactionIds.includes(transactionId)) {
    response.status(403).json({ message: "You do not have access to this transaction." });
    return;
  }

  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId
    },
    include: {
      clientRoles: {
        where: {
          clientAccountId: clientSession.clientAccountId
        }
      },
      documents: {
        include: {
          transaction: {
            select: {
              propertyAddress: true,
              stageLabel: true
            }
          }
        },
        orderBy: {
          uploadedAt: "desc"
        }
      },
      readiness: {
        where: {
          clientAccountId: clientSession.clientAccountId
        },
        orderBy: {
          computedAt: "desc"
        },
        take: 1
      },
      questions: {
        where: {
          clientAccountId: clientSession.clientAccountId
        },
        include: {
          document: {
            select: {
              title: true
            }
          },
          transaction: {
            select: {
              propertyAddress: true,
              stageLabel: true
            }
          }
        },
        orderBy: {
          askedAt: "asc"
        }
      },
      sentiments: {
        where: {
          clientAccountId: clientSession.clientAccountId
        },
        include: {
          transaction: {
            select: {
              propertyAddress: true,
              stageLabel: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      }
    }
  });

  if (!transaction) {
    response.status(404).json({ message: "Transaction not found." });
    return;
  }

  response.json({
    transaction: {
      id: transaction.id,
      propertyAddress: transaction.propertyAddress,
      propertyCity: transaction.propertyCity,
      propertyState: transaction.propertyState,
      propertyZip: transaction.propertyZip,
      propertyPrice: transaction.propertyPrice ?? undefined,
      stage: transaction.stage,
      stageLabel: transaction.stageLabel,
      role: transaction.role,
      relationshipRole: transaction.clientRoles[0]?.role ?? "client",
      readinessBucket: transaction.readiness[0]?.bucket ?? undefined,
      ...(transaction.readiness[0] ? { readiness: mapReadinessSnapshot(transaction.readiness[0]) } : {})
    },
    documents: transaction.documents.map((document) => mapDocumentRecord(document)),
    questions: transaction.questions.map((question) => mapQuestionRecord(question)),
    ...(transaction.sentiments[0] ? { latestSentiment: mapSentimentEntry(transaction.sentiments[0]) } : {})
  });
});

router.post("/transactions/:id/questions", requireClientAuth, async (request, response) => {
  const clientSession = request.clientSession;
  const transactionId = request.params["id"];

  if (!clientSession) {
    response.status(401).json({ message: "Missing client session." });
    return;
  }

  if (typeof transactionId !== "string") {
    response.status(400).json({ message: "Invalid transaction id." });
    return;
  }

  if (!clientSession.accessibleTransactionIds.includes(transactionId)) {
    response.status(403).json({ message: "You do not have access to this transaction." });
    return;
  }

  const parsedBody = askQuestionSchema.safeParse(request.body);
  if (!parsedBody.success) {
    response.status(400).json({
      message: "Invalid question payload.",
      issues: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const result = await askTransactionQuestion({
      transactionId,
      clientAccountId: clientSession.clientAccountId,
      question: parsedBody.data.question,
      ...(parsedBody.data.documentId ? { documentId: parsedBody.data.documentId } : {})
    });

    emitRealtimeEvent("client:question", {
      agentId: result.agentId,
      transactionId: result.transactionId,
      clientAccountId: result.clientAccountId,
      question: result.question.question,
      classification: result.classificationLabel,
      newReadiness: result.readiness
    });

    emitRealtimeEvent("client:sentiment", {
      agentId: result.agentId,
      transactionId: result.transactionId,
      clientAccountId: result.clientAccountId,
      sentiment: result.sentiment
    });

    response.status(201).json({
      question: result.question,
      sentiment: result.sentiment,
      readiness: result.readiness
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit question.";
    response.status(message.includes("not found") ? 404 : 400).json({ message });
  }
});

router.post("/transactions/:id/check-in", requireClientAuth, async (request, response) => {
  const clientSession = request.clientSession;
  const transactionId = request.params["id"];

  if (!clientSession) {
    response.status(401).json({ message: "Missing client session." });
    return;
  }

  if (typeof transactionId !== "string") {
    response.status(400).json({ message: "Invalid transaction id." });
    return;
  }

  if (!clientSession.accessibleTransactionIds.includes(transactionId)) {
    response.status(403).json({ message: "You do not have access to this transaction." });
    return;
  }

  const parsedBody = checkInSchema.safeParse(request.body);
  if (!parsedBody.success) {
    response.status(400).json({
      message: "Invalid check-in payload.",
      issues: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const result = await submitTransactionCheckIn({
      transactionId,
      clientAccountId: clientSession.clientAccountId,
      response: parsedBody.data.response
    });

    emitRealtimeEvent("client:sentiment", {
      agentId: result.agentId,
      transactionId: result.transactionId,
      clientAccountId: result.clientAccountId,
      sentiment: result.sentiment
    });

    response.status(201).json({
      sentiment: result.sentiment,
      readiness: result.readiness
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit check-in.";
    response.status(message.includes("not found") ? 404 : 400).json({ message });
  }
});

export { router as clientRouter };
