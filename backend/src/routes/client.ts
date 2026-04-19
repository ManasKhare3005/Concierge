import { Router } from "express";

import { prisma } from "../lib/prisma";
import { requireClientAuth } from "../middleware/clientAuth";
import { mapDocumentRecord } from "../services/documents/repository";

const router = Router();

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
      readinessBucket: transaction.readiness[0]?.bucket ?? undefined
    },
    documents: transaction.documents.map((document) => mapDocumentRecord(document))
  });
});

export { router as clientRouter };
