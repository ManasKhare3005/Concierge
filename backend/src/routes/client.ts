import { Router } from "express";

import { prisma } from "../lib/prisma";
import { requireClientAuth } from "../middleware/clientAuth";

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

export { router as clientRouter };
