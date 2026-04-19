import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { signAgentSession, signClientSession } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { requireAgentAuth } from "../middleware/agentAuth";
import { requireClientAuth } from "../middleware/clientAuth";
import { parseSearchProfileJson } from "../services/clientProfile/preferences";
import { issueMagicLinkPortal } from "../services/magicLink";

const router = Router();

const agentLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6)
});

const clientLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6)
});

const clientSetPasswordSchema = z.object({
  password: z.string().min(6).max(100)
});

const issueMagicLinkSchema = z.object({
  transactionId: z.string().min(1),
  clientAccountId: z.string().min(1),
  expiresInHours: z.number().int().positive().max(24 * 30).optional()
});

function mapAgentProfile(agent: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  brokerage: string | null;
  loftyApiKey: string | null;
}) {
  return {
    id: agent.id,
    email: agent.email,
    firstName: agent.firstName,
    lastName: agent.lastName,
    brokerage: agent.brokerage ?? undefined,
    loftyApiKeyConfigured: Boolean(agent.loftyApiKey)
  };
}

async function buildAgentSnapshot(agentId: string) {
  const [activeTransactionCount, activeClientRoleCount, pendingBotCallCount, notifications] = await Promise.all([
    prisma.transaction.count({
      where: {
        agentId,
        stage: {
          not: "closed"
        }
      }
    }),
    prisma.clientRole.count({
      where: {
        transaction: {
          agentId,
          stage: {
            not: "closed"
          }
        }
      }
    }),
    prisma.botCallSession.count({
      where: {
        agentId,
        status: "pending"
      }
    }),
    prisma.notification.findMany({
      where: {
        agentId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    })
  ]);

  return {
    counts: {
      activeTransactions: activeTransactionCount,
      activeClients: activeClientRoleCount,
      pendingBotCalls: pendingBotCallCount
    },
    notifications: notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      relatedId: notification.relatedId ?? undefined,
      read: notification.read,
      createdAt: notification.createdAt.toISOString()
    }))
  };
}

async function getAccessibleTransactionIds(clientAccountId: string): Promise<string[]> {
  const clientRoles = await prisma.clientRole.findMany({
    where: {
      clientAccountId
    },
    select: {
      transactionId: true
    }
  });

  return clientRoles.map((clientRole) => clientRole.transactionId);
}

async function getClientPortfolioSnapshot(clientAccountId: string, accessibleTransactionIds: string[]) {
  const [client, transactions] = await Promise.all([
    prisma.clientAccount.findUnique({
      where: {
        id: clientAccountId
      }
    }),
    prisma.transaction.findMany({
      where: {
        id: {
          in: accessibleTransactionIds
        }
      },
      include: {
        clientRoles: {
          where: {
            clientAccountId
          }
        },
        documents: true
      },
      orderBy: [
        {
          closedAt: "desc"
        },
        {
          expectedCloseAt: "asc"
        },
        {
          createdAt: "desc"
        }
      ]
    })
  ]);

  if (!client) {
    return null;
  }

  return {
    client: {
      id: client.id,
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName,
      ...(client.phone ? { phone: client.phone } : {}),
      preferredLanguage: client.preferredLanguage,
      hasPassword: Boolean(client.passwordHash),
      ...(parseSearchProfileJson(client.searchProfileJson) ? { searchProfile: parseSearchProfileJson(client.searchProfileJson) } : {})
    },
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
      documentCount: transaction.documents.length
    }))
  };
}

router.post("/agent/login", async (request, response) => {
  const parsedBody = agentLoginSchema.safeParse(request.body);
  if (!parsedBody.success) {
    response.status(400).json({
      message: "Invalid login payload.",
      issues: parsedBody.error.flatten()
    });
    return;
  }

  const agent = await prisma.agentAccount.findUnique({
    where: {
      email: parsedBody.data.email
    }
  });

  if (!agent || !(await bcrypt.compare(parsedBody.data.password, agent.passwordHash))) {
    response.status(401).json({
      message: "Invalid email or password."
    });
    return;
  }

  const token = signAgentSession({
    type: "agent",
    agentId: agent.id,
    email: agent.email
  });

  const snapshot = await buildAgentSnapshot(agent.id);

  response.json({
    token,
    agent: mapAgentProfile(agent),
    ...snapshot
  });
});

router.get("/agent/me", requireAgentAuth, async (request, response) => {
  const agentId = request.agent?.agentId;
  if (!agentId) {
    response.status(401).json({ message: "Missing agent session." });
    return;
  }

  const agent = await prisma.agentAccount.findUnique({
    where: {
      id: agentId
    }
  });

  if (!agent) {
    response.status(404).json({ message: "Agent account not found." });
    return;
  }

  const snapshot = await buildAgentSnapshot(agent.id);

  response.json({
    agent: mapAgentProfile(agent),
    ...snapshot
  });
});

router.post("/client/login", async (request, response) => {
  const parsedBody = clientLoginSchema.safeParse(request.body);
  if (!parsedBody.success) {
    response.status(400).json({
      message: "Invalid login payload.",
      issues: parsedBody.error.flatten()
    });
    return;
  }

  const client = await prisma.clientAccount.findUnique({
    where: {
      email: parsedBody.data.email
    }
  });

  if (!client || !client.passwordHash) {
    response.status(401).json({
      message: "Invalid email or password."
    });
    return;
  }

  const passwordMatches = await bcrypt.compare(parsedBody.data.password, client.passwordHash);
  if (!passwordMatches) {
    response.status(401).json({
      message: "Invalid email or password."
    });
    return;
  }

  const accessibleTransactionIds = await getAccessibleTransactionIds(client.id);
  const token = signClientSession({
    type: "client",
    clientAccountId: client.id,
    accessibleTransactionIds,
    via: "password"
  });

  const portfolioSnapshot = await getClientPortfolioSnapshot(client.id, accessibleTransactionIds);
  if (!portfolioSnapshot) {
    response.status(404).json({ message: "Client account not found." });
    return;
  }

  response.json({
    token,
    via: "password" as const,
    saveProgressSuggested: false,
    ...portfolioSnapshot
  });
});

router.post("/client/magic-link", requireAgentAuth, async (request, response) => {
  const parsedBody = issueMagicLinkSchema.safeParse(request.body);
  if (!parsedBody.success) {
    response.status(400).json({
      message: "Invalid magic link payload.",
      issues: parsedBody.error.flatten()
    });
    return;
  }

  const agentId = request.agent?.agentId;
  if (!agentId) {
    response.status(401).json({ message: "Missing agent session." });
    return;
  }

  const transaction = await prisma.transaction.findFirst({
    where: {
      id: parsedBody.data.transactionId,
      agentId
    },
    include: {
      clientRoles: true
    }
  });

  if (!transaction) {
    response.status(404).json({ message: "Transaction not found for this agent." });
    return;
  }

  const clientOnTransaction = transaction.clientRoles.some(
    (clientRole) => clientRole.clientAccountId === parsedBody.data.clientAccountId
  );

  if (!clientOnTransaction) {
    response.status(400).json({
      message: "That client does not belong to the selected transaction."
    });
    return;
  }

  const expiresAt =
    parsedBody.data.expiresInHours === undefined
      ? undefined
      : new Date(Date.now() + parsedBody.data.expiresInHours * 60 * 60 * 1000);

  const magicLink = await issueMagicLinkPortal(
    expiresAt
      ? {
          transactionId: parsedBody.data.transactionId,
          clientAccountId: parsedBody.data.clientAccountId,
          expiresAt
        }
      : {
          transactionId: parsedBody.data.transactionId,
          clientAccountId: parsedBody.data.clientAccountId
        }
  );

  response.json(magicLink);
});

router.post("/client/set-password", requireClientAuth, async (request, response) => {
  const parsedBody = clientSetPasswordSchema.safeParse(request.body);
  if (!parsedBody.success) {
    response.status(400).json({
      message: "Invalid password payload.",
      issues: parsedBody.error.flatten()
    });
    return;
  }

  const clientAccountId = request.clientSession?.clientAccountId;
  if (!clientAccountId) {
    response.status(401).json({ message: "Missing client session." });
    return;
  }

  const accessibleTransactionIds = await getAccessibleTransactionIds(clientAccountId);
  const passwordHash = await bcrypt.hash(parsedBody.data.password, 10);

  const client = await prisma.clientAccount.update({
    where: {
      id: clientAccountId
    },
    data: {
      passwordHash
    }
  });

  const token = signClientSession({
    type: "client",
    clientAccountId: client.id,
    accessibleTransactionIds,
    via: "password"
  });

  response.json({
    message: "Password saved. Future sign-ins can use email and password.",
    token,
    via: "password" as const,
    client: {
      id: client.id,
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName,
      ...(client.phone ? { phone: client.phone } : {}),
      preferredLanguage: client.preferredLanguage,
      hasPassword: true
    }
  });
});

router.get("/client/me", requireClientAuth, async (request, response) => {
  const clientSession = request.clientSession;
  if (!clientSession) {
    response.status(401).json({ message: "Missing client session." });
    return;
  }

  const portfolioSnapshot = await getClientPortfolioSnapshot(
    clientSession.clientAccountId,
    clientSession.accessibleTransactionIds
  );

  if (!portfolioSnapshot) {
    response.status(404).json({ message: "Client account not found." });
    return;
  }

  response.json({
    via: clientSession.via,
    saveProgressSuggested: clientSession.via === "magic_link" && !portfolioSnapshot.client.hasPassword,
    ...portfolioSnapshot
  });
});

export { router as authRouter };
