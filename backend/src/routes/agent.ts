import { Router } from "express";

import { prisma } from "../lib/prisma";
import { requireAgentAuth } from "../middleware/agentAuth";
import { mapDocumentRecord } from "../services/documents/repository";
import { buildAgentTriage } from "../services/triage/dashboard";
import { buildRepeatClients } from "../services/triage/repeatClients";

const router = Router();

router.get("/triage", requireAgentAuth, async (request, response) => {
  const agentId = request.agent?.agentId;
  if (!agentId) {
    response.status(401).json({ message: "Missing agent session." });
    return;
  }

  const triage = await buildAgentTriage(agentId);
  response.json(triage);
});

router.get("/transactions", requireAgentAuth, async (request, response) => {
  const agentId = request.agent?.agentId;
  if (!agentId) {
    response.status(401).json({ message: "Missing agent session." });
    return;
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      agentId,
      stage: {
        not: "closed"
      }
    },
    include: {
      clientRoles: {
        include: {
          clientAccount: true
        }
      },
      documents: true
    },
    orderBy: [
      {
        expectedCloseAt: "asc"
      },
      {
        createdAt: "desc"
      }
    ]
  });

  response.json({
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      propertyAddress: transaction.propertyAddress,
      propertyCity: transaction.propertyCity,
      propertyState: transaction.propertyState,
      propertyZip: transaction.propertyZip,
      stage: transaction.stage,
      stageLabel: transaction.stageLabel,
      role: transaction.role,
      documentCount: transaction.documents.length,
      clients: transaction.clientRoles.map((clientRole) => ({
        id: clientRole.clientAccount.id,
        firstName: clientRole.clientAccount.firstName,
        lastName: clientRole.clientAccount.lastName,
        role: clientRole.role
      }))
    }))
  });
});

router.get("/repeat-clients", requireAgentAuth, async (request, response) => {
  const agentId = request.agent?.agentId;
  if (!agentId) {
    response.status(401).json({ message: "Missing agent session." });
    return;
  }

  const repeatClients = await buildRepeatClients(agentId);
  response.json(repeatClients);
});

router.get("/transactions/:id/documents", requireAgentAuth, async (request, response) => {
  const agentId = request.agent?.agentId;
  const transactionId = request.params["id"];

  if (!agentId) {
    response.status(401).json({ message: "Missing agent session." });
    return;
  }

  if (typeof transactionId !== "string") {
    response.status(400).json({ message: "Invalid transaction id." });
    return;
  }

  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      agentId
    },
    include: {
      clientRoles: {
        include: {
          clientAccount: true
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
      }
    }
  });

  if (!transaction) {
    response.status(404).json({ message: "Transaction not found for this agent." });
    return;
  }

  response.json({
    transaction: {
      id: transaction.id,
      propertyAddress: transaction.propertyAddress,
      propertyCity: transaction.propertyCity,
      propertyState: transaction.propertyState,
      propertyZip: transaction.propertyZip,
      stage: transaction.stage,
      stageLabel: transaction.stageLabel,
      role: transaction.role,
      clients: transaction.clientRoles.map((clientRole) => ({
        id: clientRole.clientAccount.id,
        firstName: clientRole.clientAccount.firstName,
        lastName: clientRole.clientAccount.lastName,
        role: clientRole.role
      }))
    },
    documents: transaction.documents.map((document) => mapDocumentRecord(document))
  });
});

export { router as agentRouter };
