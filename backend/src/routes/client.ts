import { Router } from "express";
import { z } from "zod";

import { initiateOutboundCall } from "../lib/elevenlabs";
import { prisma } from "../lib/prisma";
import { requireClientAuth } from "../middleware/clientAuth";
import {
  buildRecommendedPropertyMatches,
  parseSearchProfileJson,
  sanitizeClientSearchProfile,
  serializeClientSearchProfile
} from "../services/clientProfile/preferences";
import { askTransactionQuestion, submitTransactionCheckIn } from "../services/clientPortal/engagement";
import {
  mapQuestionRecord,
  mapReadinessSnapshot,
  mapSentimentEntry
} from "../services/clientPortal/repository";
import { mapDocumentRecord } from "../services/documents/repository";
import { emitRealtimeEvent } from "../services/sync/realtime";
import {
  confirmClientVoiceBotSession,
  getLatestClientVoiceBotSession,
  respondToClientVoiceBotSession
} from "../services/voiceBot/orchestrator";

const router = Router();

const askQuestionSchema = z.object({
  question: z.string().trim().min(4).max(1_200),
  documentId: z.string().min(1).optional()
});

const checkInSchema = z.object({
  response: z.string().trim().min(3).max(600)
});

const voiceBotResponseSchema = z.object({
  response: z.string().trim().min(2).max(400)
});

const voiceBotConfirmSchema = z.object({
  bookedSlot: z.string().datetime(),
  clientNewQuestion: z.string().trim().min(3).max(400).optional()
});

const clientSearchProfileSchema = z.object({
  targetCities: z.array(z.string().trim().min(2).max(60)).max(8),
  priceMin: z.number().int().positive().max(20_000_000).optional(),
  priceMax: z.number().int().positive().max(20_000_000).optional(),
  bedroomsMin: z.number().int().positive().max(12).optional(),
  bathroomsMin: z.number().positive().max(12).optional(),
  timeline: z.string().trim().max(120).optional(),
  propertyStyle: z.string().trim().max(80).optional(),
  mustHaves: z.array(z.string().trim().min(2).max(80)).max(8),
  dealBreakers: z.array(z.string().trim().min(2).max(80)).max(8),
  notes: z.string().trim().max(600).optional()
});

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(24)
    .regex(/^\+?[0-9()\-\s]+$/)
    .optional(),
  preferredLanguage: z.enum(["en", "es"]),
  searchProfile: clientSearchProfileSchema
});

const callMeSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(7)
    .max(24)
    .regex(/^\+?[0-9()\-\s]+$/)
    .optional()
});

function buildClientProfileResponse(client: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  preferredLanguage: string;
  passwordHash: string | null;
  searchProfileJson?: string | null;
}) {
  const searchProfile = parseSearchProfileJson(client.searchProfileJson);

  return {
    client: {
      id: client.id,
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName,
      ...(client.phone ? { phone: client.phone } : {}),
      preferredLanguage: client.preferredLanguage,
      hasPassword: Boolean(client.passwordHash),
      ...(searchProfile ? { searchProfile } : {})
    },
    recommendedProperties: buildRecommendedPropertyMatches(searchProfile)
  };
}

function parseJsonStringArray(value?: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

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
      agent: {
        select: {
          firstName: true,
          lastName: true,
          brokerage: true
        }
      },
      clientRoles: {
        include: {
          clientAccount: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      },
      documents: {
        select: {
          id: true,
          openedByClient: true
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
        orderBy: {
          askedAt: "desc"
        },
        select: {
          question: true,
          category: true,
          severity: true,
          askedAt: true
        }
      },
      sentiments: {
        where: {
          clientAccountId: clientSession.clientAccountId
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 1,
        select: {
          sentiment: true,
          createdAt: true,
          agentAlertNeeded: true
        }
      },
      botSessions: {
        where: {
          clientAccountId: clientSession.clientAccountId
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 1,
        select: {
          status: true,
          bookedSlot: true,
          createdAt: true
        }
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
      relationshipRole:
        transaction.clientRoles.find(
          (clientRole) => clientRole.clientAccount.id === clientSession.clientAccountId
        )?.role ?? "client",
      documentCount: transaction.documents.length,
      openedDocumentCount: transaction.documents.filter((document) => document.openedByClient).length,
      questionCount: transaction.questions.length,
      readinessBucket: transaction.readiness[0]?.bucket ?? undefined,
      readinessReasoning: transaction.readiness[0]?.reasoning ?? undefined,
      topConcerns: parseJsonStringArray(transaction.readiness[0]?.topConcerns),
      agent: {
        firstName: transaction.agent.firstName,
        lastName: transaction.agent.lastName,
        ...(transaction.agent.brokerage ? { brokerage: transaction.agent.brokerage } : {})
      },
      participants: transaction.clientRoles.map((clientRole) => ({
        id: clientRole.clientAccount.id,
        firstName: clientRole.clientAccount.firstName,
        lastName: clientRole.clientAccount.lastName,
        role: clientRole.role,
        isYou: clientRole.clientAccount.id === clientSession.clientAccountId
      })),
      ...(transaction.questions[0]
        ? {
            latestQuestion: {
              question: transaction.questions[0].question,
              category: transaction.questions[0].category,
              severity: transaction.questions[0].severity,
              askedAt: transaction.questions[0].askedAt.toISOString()
            }
          }
        : {}),
      ...(transaction.sentiments[0]
        ? {
            latestSentiment: {
              sentiment: transaction.sentiments[0].sentiment,
              createdAt: transaction.sentiments[0].createdAt.toISOString(),
              agentAlertNeeded: transaction.sentiments[0].agentAlertNeeded
            }
          }
        : {}),
      ...(transaction.botSessions[0]
        ? {
            latestBotCall: {
              status: transaction.botSessions[0].status,
              createdAt: transaction.botSessions[0].createdAt.toISOString(),
              ...(transaction.botSessions[0].bookedSlot
                ? { bookedSlot: transaction.botSessions[0].bookedSlot.toISOString() }
                : {})
            }
          }
        : {})
    }))
  });
});

router.get("/profile", requireClientAuth, async (request, response) => {
  const clientSession = request.clientSession;

  if (!clientSession) {
    response.status(401).json({ message: "Missing client session." });
    return;
  }

  const client = await prisma.clientAccount.findUnique({
    where: {
      id: clientSession.clientAccountId
    }
  });

  if (!client) {
    response.status(404).json({ message: "Client account not found." });
    return;
  }

  response.json(buildClientProfileResponse(client));
});

router.patch("/profile", requireClientAuth, async (request, response) => {
  const clientSession = request.clientSession;

  if (!clientSession) {
    response.status(401).json({ message: "Missing client session." });
    return;
  }

  const parsedBody = updateProfileSchema.safeParse(request.body);
  if (!parsedBody.success) {
    response.status(400).json({
      message: "Invalid profile payload.",
      issues: parsedBody.error.flatten()
    });
    return;
  }

  const searchProfile = sanitizeClientSearchProfile(parsedBody.data.searchProfile);

  const client = await prisma.clientAccount.update({
    where: {
      id: clientSession.clientAccountId
    },
    data: {
      firstName: parsedBody.data.firstName,
      lastName: parsedBody.data.lastName,
      phone: parsedBody.data.phone?.trim() || null,
      preferredLanguage: parsedBody.data.preferredLanguage,
      searchProfileJson: serializeClientSearchProfile(searchProfile),
      profileUpdatedAt: new Date()
    }
  });

  response.json({
    message: "Profile saved.",
    ...buildClientProfileResponse(client)
  });
});

router.post("/profile/call-me", requireClientAuth, async (request, response) => {
  const clientSession = request.clientSession;

  if (!clientSession) {
    response.status(401).json({ message: "Missing client session." });
    return;
  }

  const parsedBody = callMeSchema.safeParse(request.body);
  if (!parsedBody.success) {
    response.status(400).json({
      message: "Invalid call request payload.",
      issues: parsedBody.error.flatten()
    });
    return;
  }

  const client = await prisma.clientAccount.findUnique({
    where: {
      id: clientSession.clientAccountId
    }
  });

  if (!client) {
    response.status(404).json({ message: "Client account not found." });
    return;
  }

  const requestedPhone = parsedBody.data.phone?.trim();
  const phoneToCall = requestedPhone || client.phone;

  if (!phoneToCall) {
    response.status(400).json({
      message: "Add a phone number to your profile before requesting a call."
    });
    return;
  }

  const callResult = await initiateOutboundCall({
    toNumber: phoneToCall,
    sources: [
      `client:${client.id}`,
      `email:${client.email}`,
      `phone:${phoneToCall}`,
      `profile:${client.searchProfileJson ? "complete" : "basic"}`
    ]
  });

  response.status(callResult.success ? 200 : 202).json({
    call: callResult
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

  const voiceBotSession = await getLatestClientVoiceBotSession(transactionId, clientSession.clientAccountId);

  response.json({
    transaction: {
      id: transaction.id,
      propertyAddress: transaction.propertyAddress,
      propertyCity: transaction.propertyCity,
      propertyState: transaction.propertyState,
      propertyZip: transaction.propertyZip,
      propertyPrice: transaction.propertyPrice ?? undefined,
      expectedCloseAt: transaction.expectedCloseAt?.toISOString(),
      stage: transaction.stage,
      stageLabel: transaction.stageLabel,
      role: transaction.role,
      relationshipRole: transaction.clientRoles[0]?.role ?? "client",
      readinessBucket: transaction.readiness[0]?.bucket ?? undefined,
      ...(transaction.readiness[0] ? { readiness: mapReadinessSnapshot(transaction.readiness[0]) } : {})
    },
    documents: transaction.documents.map((document) => mapDocumentRecord(document)),
    questions: transaction.questions.map((question) => mapQuestionRecord(question)),
    ...(voiceBotSession ? { voiceBotSession } : {}),
    ...(transaction.sentiments[0] ? { latestSentiment: mapSentimentEntry(transaction.sentiments[0]) } : {})
  });
});

router.post("/transactions/:id/voice-bot/respond", requireClientAuth, async (request, response) => {
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

  const parsedBody = voiceBotResponseSchema.safeParse(request.body);
  if (!parsedBody.success) {
    response.status(400).json({
      message: "Invalid voice-bot response payload.",
      issues: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const session = await respondToClientVoiceBotSession({
      transactionId,
      clientAccountId: clientSession.clientAccountId,
      response: parsedBody.data.response
    });

    response.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to advance the Closing Day follow-up.";
    response.status(message.includes("not found") ? 404 : 400).json({ message });
  }
});

router.post("/transactions/:id/voice-bot/confirm", requireClientAuth, async (request, response) => {
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

  const parsedBody = voiceBotConfirmSchema.safeParse(request.body);
  if (!parsedBody.success) {
    response.status(400).json({
      message: "Invalid voice-bot confirmation payload.",
      issues: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const session = await confirmClientVoiceBotSession({
      transactionId,
      clientAccountId: clientSession.clientAccountId,
      bookedSlot: parsedBody.data.bookedSlot,
      ...(parsedBody.data.clientNewQuestion ? { clientNewQuestion: parsedBody.data.clientNewQuestion } : {})
    });

    response.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to confirm the Closing Day meeting.";
    response.status(message.includes("not found") ? 404 : 400).json({ message });
  }
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
      readiness: result.readiness,
      ...(result.autoFollowUp ? { autoFollowUp: result.autoFollowUp } : {})
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
