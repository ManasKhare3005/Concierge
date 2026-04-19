import type {
  BotTone,
  VoiceBotPrepBrief,
  VoiceBotSessionRecord
} from "@shared";
import type { BotCallSession, Transaction } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { synthesizeSpeech } from "../../lib/elevenlabs";
import { writePrepBrief } from "../ai/prepBriefWriter";
import { buildVoiceBotScript } from "../ai/voiceBotScripter";
import { emitRealtimeEvent } from "../sync/realtime";
import {
  advanceSimulatedCall,
  buildInitialTranscript,
  extractClientQuestion,
  getSimulatedCallPresentation
} from "./simulatedCallEngine";
import {
  parseJsonStringArray,
  parseStoredPrepBrief,
  parseStoredVoiceBotScript,
  serializeStoredPrepBrief,
  serializeStoredVoiceBotScript,
  type StoredVoiceBotScript
} from "./repository";

type TransactionSummary = Pick<
  Transaction,
  "propertyAddress" | "propertyCity" | "propertyState" | "propertyZip" | "stageLabel"
>;

interface VoiceBotTransactionContext extends Transaction {
  agent: {
    firstName: string;
    lastName: string;
  };
  clientRoles: Array<{
    role: string;
    clientAccount: {
      id: string;
      firstName: string;
      lastName: string;
      preferredLanguage: string;
    };
  }>;
  readiness: Array<{
    topConcerns: string;
    computedAt: Date;
  }>;
  questions: Array<{
    question: string;
    askedAt: Date;
  }>;
  documents: Array<{
    title: string;
    summaryTlDr: string | null;
  }>;
}

interface VoiceBotSessionWithContext extends BotCallSession {
  transaction: TransactionSummary;
  clientAccount: {
    firstName: string;
    lastName: string;
  };
}

interface SessionPatchInput {
  status?: BotCallSession["status"];
  topConcerns?: string;
  proposedSlots?: string;
  tone?: string;
  clientNewQuestion?: string;
}

export interface InitiateVoiceBotInput {
  agentId: string;
  transactionId: string;
  clientAccountId: string;
  concerns?: string[];
  tone?: BotTone;
  proposedSlots?: string[];
}

export interface RespondToVoiceBotInput {
  agentId: string;
  sessionId: string;
  response: string;
}

export interface ConfirmVoiceBotInput {
  agentId: string;
  sessionId: string;
  bookedSlot: string;
  clientNewQuestion?: string;
}

function trimToLength(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trim()}...`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function parseTopConcerns(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    return [];
  }

  return [];
}

function buildDefaultSlots(): string[] {
  const baseDate = new Date();
  return [1, 2, 3].map((offset, index) => {
    const slot = new Date(baseDate);
    slot.setDate(slot.getDate() + offset);
    slot.setHours(index === 0 ? 10 : index === 1 ? 13 : 16, 0, 0, 0);
    return slot.toISOString();
  });
}

function resolveConcerns(transaction: VoiceBotTransactionContext, concerns?: string[]): string[] {
  const provided = uniqueStrings((concerns ?? []).map((concern) => trimToLength(concern, 120))).slice(0, 3);
  if (provided.length > 0) {
    return provided;
  }

  const readinessConcerns = transaction.readiness[0] ? parseTopConcerns(transaction.readiness[0].topConcerns) : [];
  if (readinessConcerns.length > 0) {
    return readinessConcerns.slice(0, 3);
  }

  return transaction.questions.slice(0, 3).map((question) => trimToLength(question.question, 120));
}

async function loadClientSummary(clientAccountId: string): Promise<VoiceBotSessionWithContext["clientAccount"]> {
  const client = await prisma.clientAccount.findUnique({
    where: {
      id: clientAccountId
    },
    select: {
      firstName: true,
      lastName: true
    }
  });

  if (!client) {
    throw new Error("Client account not found.");
  }

  return client;
}

async function withSessionContext(
  session: BotCallSession & { transaction: TransactionSummary }
): Promise<VoiceBotSessionWithContext> {
  const clientAccount = await loadClientSummary(session.clientAccountId);
  return {
    ...session,
    clientAccount
  };
}

async function getTransactionContext(
  agentId: string,
  transactionId: string,
  clientAccountId: string
): Promise<VoiceBotTransactionContext> {
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      agentId
    },
    include: {
      agent: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      clientRoles: {
        where: {
          clientAccountId
        },
        include: {
          clientAccount: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              preferredLanguage: true
            }
          }
        }
      },
      readiness: {
        where: {
          clientAccountId
        },
        orderBy: {
          computedAt: "desc"
        },
        take: 1
      },
      questions: {
        where: {
          clientAccountId
        },
        orderBy: {
          askedAt: "desc"
        },
        take: 5,
        select: {
          question: true,
          askedAt: true
        }
      },
      documents: {
        orderBy: {
          uploadedAt: "desc"
        },
        take: 3,
        select: {
          title: true,
          summaryTlDr: true
        }
      }
    }
  });

  if (!transaction || transaction.clientRoles.length === 0) {
    throw new Error("Transaction not found for this client.");
  }

  return transaction;
}

async function getSessionWithContext(
  agentId: string,
  sessionId: string
): Promise<VoiceBotSessionWithContext> {
  const session = await prisma.botCallSession.findFirst({
    where: {
      id: sessionId,
      agentId
    },
    include: {
      transaction: {
        select: {
          propertyAddress: true,
          propertyCity: true,
          propertyState: true,
          propertyZip: true,
          stageLabel: true
        }
      }
    }
  });

  if (!session) {
    throw new Error("Voice bot session not found.");
  }

  return withSessionContext(session);
}

async function hydrateVoiceBotSession(
  session: VoiceBotSessionWithContext
): Promise<VoiceBotSessionRecord> {
  const storedScript = parseStoredVoiceBotScript(session);
  const topConcerns = parseJsonStringArray(session.topConcerns);
  const proposedSlots = parseJsonStringArray(session.proposedSlots);
  const presentation = getSimulatedCallPresentation({
    clientFirstName: session.clientAccount.firstName,
    topConcerns,
    proposedSlots,
    plan: storedScript.plan,
    transcript: storedScript.turns
  });

  const currentBotAudio = presentation.currentBotTurn
    ? await synthesizeSpeech({
        text: presentation.currentBotTurn.text,
        sources: [
          `session:${session.id}`,
          `property:${session.transaction.propertyAddress}`,
          `client:${session.clientAccount.firstName} ${session.clientAccount.lastName}`
        ]
      })
    : undefined;

  const prepBrief = parseStoredPrepBrief(session.prepBrief);

  return {
    id: session.id,
    transactionId: session.transactionId,
    clientAccountId: session.clientAccountId,
    agentId: session.agentId,
    clientName: `${session.clientAccount.firstName} ${session.clientAccount.lastName}`,
    clientFirstName: session.clientAccount.firstName,
    propertyAddress: session.transaction.propertyAddress,
    propertyCity: session.transaction.propertyCity,
    propertyState: session.transaction.propertyState,
    propertyZip: session.transaction.propertyZip,
    stageLabel: session.transaction.stageLabel,
    status: session.status as VoiceBotSessionRecord["status"],
    topConcerns,
    proposedSlots,
    tone: session.tone as BotTone,
    script: storedScript.turns,
    responseOptions: presentation.responseOptions,
    canConfirmBooking: presentation.canConfirmBooking,
    ...(presentation.currentBotTurn ? { currentBotTurn: presentation.currentBotTurn } : {}),
    ...(currentBotAudio ? { currentBotAudio } : {}),
    ...(session.bookedSlot ? { bookedSlot: session.bookedSlot.toISOString() } : {}),
    ...(session.clientNewQuestion ? { clientNewQuestion: session.clientNewQuestion } : {}),
    ...(prepBrief ? { prepBrief } : {}),
    generatedBy: storedScript.generatedBy,
    transparency: storedScript.transparency,
    createdAt: session.createdAt.toISOString(),
    ...(session.concludedAt ? { concludedAt: session.concludedAt.toISOString() } : {})
  };
}

async function saveSessionScript(
  sessionId: string,
  script: StoredVoiceBotScript,
  patch?: SessionPatchInput
): Promise<VoiceBotSessionWithContext> {
  const session = await prisma.botCallSession.update({
    where: {
      id: sessionId
    },
    data: {
      script: serializeStoredVoiceBotScript(script),
      ...(patch?.status ? { status: patch.status } : {}),
      ...(patch?.topConcerns ? { topConcerns: patch.topConcerns } : {}),
      ...(patch?.proposedSlots ? { proposedSlots: patch.proposedSlots } : {}),
      ...(patch?.tone ? { tone: patch.tone } : {}),
      ...(patch?.clientNewQuestion ? { clientNewQuestion: patch.clientNewQuestion } : {})
    },
    include: {
      transaction: {
        select: {
          propertyAddress: true,
          propertyCity: true,
          propertyState: true,
          propertyZip: true,
          stageLabel: true
        }
      }
    }
  });

  return withSessionContext(session);
}

export async function initiateVoiceBotSession(
  input: InitiateVoiceBotInput
): Promise<VoiceBotSessionRecord> {
  const transaction = await getTransactionContext(input.agentId, input.transactionId, input.clientAccountId);
  const client = transaction.clientRoles[0]?.clientAccount;
  if (!client) {
    throw new Error("Client was not found on this transaction.");
  }

  const concerns = resolveConcerns(transaction, input.concerns);
  const proposedSlots = (input.proposedSlots?.length === 3 ? input.proposedSlots : buildDefaultSlots()).slice(0, 3);
  const tone = input.tone ?? "warm";

  const scriptResult = await buildVoiceBotScript({
    agentFirstName: transaction.agent.firstName,
    clientFirstName: client.firstName,
    propertyAddress: transaction.propertyAddress,
    stageLabel: transaction.stageLabel,
    topConcerns: concerns,
    tone,
    proposedSlots
  });

  const storedScript: StoredVoiceBotScript = {
    plan: scriptResult.plan,
    turns: buildInitialTranscript(scriptResult.plan),
    generatedBy: scriptResult.generatedBy,
    transparency: scriptResult.transparency
  };

  const topConcerns = JSON.stringify(concerns);
  const serializedSlots = JSON.stringify(proposedSlots);

  const existingSession = await prisma.botCallSession.findFirst({
    where: {
      agentId: input.agentId,
      transactionId: input.transactionId,
      clientAccountId: input.clientAccountId,
      status: {
        in: ["pending", "in_progress"]
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      transaction: {
        select: {
          propertyAddress: true,
          propertyCity: true,
          propertyState: true,
          propertyZip: true,
          stageLabel: true
        }
      }
    }
  });

  const session = existingSession
    ? await saveSessionScript(existingSession.id, storedScript, {
        status: "in_progress",
        topConcerns,
        proposedSlots: serializedSlots,
        tone
      })
    : await withSessionContext(
        await prisma.botCallSession.create({
          data: {
            transactionId: input.transactionId,
            clientAccountId: input.clientAccountId,
            agentId: input.agentId,
            status: "in_progress",
            topConcerns,
            proposedSlots: serializedSlots,
            tone,
            script: serializeStoredVoiceBotScript(storedScript)
          },
          include: {
            transaction: {
              select: {
                propertyAddress: true,
                propertyCity: true,
                propertyState: true,
                propertyZip: true,
                stageLabel: true
              }
            }
          }
        })
      );

  return hydrateVoiceBotSession(session);
}

export async function getVoiceBotSession(
  agentId: string,
  sessionId: string
): Promise<VoiceBotSessionRecord> {
  const session = await getSessionWithContext(agentId, sessionId);
  return hydrateVoiceBotSession(session);
}

export async function respondToVoiceBotSession(
  input: RespondToVoiceBotInput
): Promise<VoiceBotSessionRecord> {
  const session = await getSessionWithContext(input.agentId, input.sessionId);
  if (session.status === "booked" || session.status === "declined" || session.status === "failed") {
    throw new Error("This voice bot session is already closed.");
  }

  const storedScript = parseStoredVoiceBotScript(session);
  const topConcerns = parseJsonStringArray(session.topConcerns);
  const proposedSlots = parseJsonStringArray(session.proposedSlots);
  const currentPresentation = getSimulatedCallPresentation({
    clientFirstName: session.clientAccount.firstName,
    topConcerns,
    proposedSlots,
    plan: storedScript.plan,
    transcript: storedScript.turns
  });

  if (currentPresentation.canConfirmBooking) {
    throw new Error("This voice bot session is ready to confirm a booking.");
  }

  const nextTranscript = advanceSimulatedCall(
    {
      clientFirstName: session.clientAccount.firstName,
      topConcerns,
      proposedSlots,
      plan: storedScript.plan,
      transcript: storedScript.turns
    },
    input.response
  );

  const extractedQuestion = extractClientQuestion(input.response);
  const updatedSession = await saveSessionScript(
    session.id,
    {
      ...storedScript,
      turns: nextTranscript
    },
    {
      status: "in_progress",
      ...(extractedQuestion ? { clientNewQuestion: extractedQuestion } : {})
    }
  );

  return hydrateVoiceBotSession(updatedSession);
}

export async function confirmVoiceBotSession(
  input: ConfirmVoiceBotInput
): Promise<VoiceBotSessionRecord> {
  const session = await getSessionWithContext(input.agentId, input.sessionId);
  if (session.status === "booked" || session.status === "declined" || session.status === "failed") {
    throw new Error("This voice bot session is already closed.");
  }

  const storedScript = parseStoredVoiceBotScript(session);
  const topConcerns = parseJsonStringArray(session.topConcerns);
  const proposedSlots = parseJsonStringArray(session.proposedSlots);
  const presentation = getSimulatedCallPresentation({
    clientFirstName: session.clientAccount.firstName,
    topConcerns,
    proposedSlots,
    plan: storedScript.plan,
    transcript: storedScript.turns
  });

  if (!presentation.canConfirmBooking) {
    throw new Error("The call needs more context before booking can be confirmed.");
  }

  if (!proposedSlots.includes(input.bookedSlot)) {
    throw new Error("Booked slot must match one of the proposed times.");
  }

  const [transactionContext, recentQuestions] = await Promise.all([
    prisma.transaction.findFirst({
      where: {
        id: session.transactionId,
        agentId: input.agentId
      },
      include: {
        agent: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        documents: {
          select: {
            title: true,
            summaryTlDr: true
          },
          orderBy: {
            uploadedAt: "desc"
          },
          take: 3
        }
      }
    }),
    prisma.question.findMany({
      where: {
        transactionId: session.transactionId,
        clientAccountId: session.clientAccountId
      },
      orderBy: {
        askedAt: "desc"
      },
      take: 4,
      select: {
        question: true
      }
    })
  ]);

  if (!transactionContext) {
    throw new Error("Transaction not found for this voice bot session.");
  }

  const prepBriefResult = await writePrepBrief({
    agentName: `${transactionContext.agent.firstName} ${transactionContext.agent.lastName}`,
    clientName: `${session.clientAccount.firstName} ${session.clientAccount.lastName}`,
    propertyAddress: transactionContext.propertyAddress,
    stageLabel: transactionContext.stageLabel,
    topConcerns,
    conversationTranscript: storedScript.turns.map((turn) => `${turn.speaker}: ${turn.text}`),
    recentQuestions: recentQuestions.map((question) => question.question),
    documentContext: transactionContext.documents.map((document) =>
      document.summaryTlDr ? `${document.title}: ${document.summaryTlDr}` : document.title
    )
  });

  const prepBrief: VoiceBotPrepBrief = {
    text: prepBriefResult.text,
    generatedBy: prepBriefResult.generatedBy,
    transparency: prepBriefResult.transparency
  };

  const updatedSession = await withSessionContext(
    await prisma.botCallSession.update({
      where: {
        id: session.id
      },
      data: {
        status: "booked",
        bookedSlot: new Date(input.bookedSlot),
        clientNewQuestion: input.clientNewQuestion
          ? trimToLength(input.clientNewQuestion, 280)
          : session.clientNewQuestion,
        prepBrief: serializeStoredPrepBrief(prepBrief),
        concludedAt: new Date()
      },
      include: {
        transaction: {
          select: {
            propertyAddress: true,
            propertyCity: true,
            propertyState: true,
            propertyZip: true,
            stageLabel: true
          }
        }
      }
    })
  );

  await prisma.notification.create({
    data: {
      agentId: input.agentId,
      type: "bot_booked",
      title: `${session.clientAccount.firstName} booked through the voice bot`,
      body: `Closing Day booked ${new Date(input.bookedSlot).toLocaleString()} and generated a prep brief for ${session.transaction.propertyAddress}.`,
      relatedId: session.id
    }
  });

  emitRealtimeEvent("bot:booked", {
    agentId: input.agentId,
    transactionId: session.transactionId,
    clientAccountId: session.clientAccountId,
    sessionId: session.id,
    bookedSlot: input.bookedSlot
  });

  return hydrateVoiceBotSession(updatedSession);
}
