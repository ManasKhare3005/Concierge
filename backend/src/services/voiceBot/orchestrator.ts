import type {
  BotScriptTurn,
  BotTone,
  VoiceBotPrepBrief,
  VoiceBotSessionRecord
} from "@shared";
import type { BotCallSession, Transaction } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { initiateOutboundCall, synthesizeSpeech, type OutboundCallResult } from "../../lib/elevenlabs";
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
      phone: string | null;
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

interface HydrateVoiceBotOptions {
  includeAudio?: boolean;
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

export interface RespondToClientVoiceBotInput {
  transactionId: string;
  clientAccountId: string;
  response: string;
}

export interface ConfirmClientVoiceBotInput {
  transactionId: string;
  clientAccountId: string;
  bookedSlot: string;
  clientNewQuestion?: string;
}

export interface UpdateVoiceBotSessionSlotsInput {
  agentId: string;
  sessionId: string;
  proposedSlots: string[];
}

export interface AutomatedVoiceFollowUpInput {
  agentId: string;
  transactionId: string;
  clientAccountId: string;
  severity: number;
  triggeringQuestion: string;
  topConcerns: string[];
  agentPrepNote: string;
  recommendedAgentAction: string;
}

export interface AutomatedVoiceFollowUpResult {
  sessionId: string;
  status: VoiceBotSessionRecord["status"];
  createdNewSession: boolean;
  callResult?: OutboundCallResult;
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

function buildFallbackCallResult(message: string, sources: string[]): OutboundCallResult {
  return {
    success: false,
    message,
    generatedBy: "fallback",
    transparency: {
      sources,
      note: "Fallback response: Closing Day staged the follow-up session, but no live outbound call was started."
    }
  };
}

function buildAutomatedConcerns(triggeringQuestion: string, topConcerns: string[]): string[] {
  return uniqueStrings([
    ...topConcerns,
    trimToLength(triggeringQuestion.replace(/\s+/g, " ").trim(), 120)
  ]).slice(0, 3);
}

function replaceBotTurnsWithPlan(turns: BotScriptTurn[], plan: string[]): BotScriptTurn[] {
  let botIndex = 0;

  return turns.map((turn) => {
    if (turn.speaker !== "bot") {
      return turn;
    }

    const nextText = plan[botIndex] ?? turn.text;
    botIndex += 1;

    return {
      ...turn,
      text: trimToLength(nextText, 280)
    };
  });
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
              phone: true,
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

async function getLatestSessionWithContextForClient(
  transactionId: string,
  clientAccountId: string,
  statuses?: BotCallSession["status"][]
): Promise<VoiceBotSessionWithContext | null> {
  const session = await prisma.botCallSession.findFirst({
    where: {
      transactionId,
      clientAccountId,
      ...(statuses ? { status: { in: statuses } } : {})
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
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return session ? withSessionContext(session) : null;
}

async function hydrateVoiceBotSession(
  session: VoiceBotSessionWithContext,
  options?: HydrateVoiceBotOptions
): Promise<VoiceBotSessionRecord> {
  const storedScript = parseStoredVoiceBotScript(session);
  const topConcerns = parseJsonStringArray(session.topConcerns);
  const proposedSlots = parseJsonStringArray(session.proposedSlots);
  const isOpenSession = session.status === "pending" || session.status === "in_progress";
  const presentation = getSimulatedCallPresentation({
    clientFirstName: session.clientAccount.firstName,
    topConcerns,
    proposedSlots,
    plan: storedScript.plan,
    transcript: storedScript.turns
  });

  const currentBotAudio = options?.includeAudio !== false && isOpenSession && presentation.currentBotTurn
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
    responseOptions: isOpenSession ? presentation.responseOptions : [],
    canConfirmBooking: isOpenSession && presentation.canConfirmBooking,
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

export async function initiateAutomatedVoiceFollowUp(
  input: AutomatedVoiceFollowUpInput
): Promise<AutomatedVoiceFollowUpResult> {
  if (input.severity < 3) {
    throw new Error("Automated voice follow-up only runs for severity 3 or higher.");
  }

  const transaction = await getTransactionContext(input.agentId, input.transactionId, input.clientAccountId);
  const client = transaction.clientRoles[0]?.clientAccount;
  if (!client) {
    throw new Error("Client was not found on this transaction.");
  }

  const concerns = buildAutomatedConcerns(input.triggeringQuestion, input.topConcerns);
  const proposedSlots = buildDefaultSlots();
  const tone: BotTone = "warm";

  const [scriptResult, prepBriefResult] = await Promise.all([
    buildVoiceBotScript({
      agentFirstName: transaction.agent.firstName,
      clientFirstName: client.firstName,
      propertyAddress: transaction.propertyAddress,
      stageLabel: transaction.stageLabel,
      topConcerns: concerns,
      tone,
      proposedSlots
    }),
    writePrepBrief({
      agentName: `${transaction.agent.firstName} ${transaction.agent.lastName}`,
      clientName: `${client.firstName} ${client.lastName}`,
      propertyAddress: transaction.propertyAddress,
      stageLabel: transaction.stageLabel,
      topConcerns: concerns,
      conversationTranscript: [
        `client: ${input.triggeringQuestion}`,
        `system: ${input.agentPrepNote}`,
        `system: ${input.recommendedAgentAction}`
      ],
      recentQuestions: [
        input.triggeringQuestion,
        ...transaction.questions.map((question) => question.question)
      ].slice(0, 4),
      documentContext: transaction.documents.map((document) =>
        document.summaryTlDr ? `${document.title}: ${document.summaryTlDr}` : document.title
      )
    })
  ]);

  const storedScript: StoredVoiceBotScript = {
    plan: scriptResult.plan,
    turns: buildInitialTranscript(scriptResult.plan),
    generatedBy: scriptResult.generatedBy,
    transparency: scriptResult.transparency
  };

  const prepBrief = {
    text: prepBriefResult.text,
    generatedBy: prepBriefResult.generatedBy,
    transparency: prepBriefResult.transparency
  };

  const topConcerns = JSON.stringify(concerns);
  const serializedSlots = JSON.stringify(proposedSlots);
  const clientQuestion = trimToLength(input.triggeringQuestion, 280);

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

  if (existingSession) {
    await saveSessionScript(
      existingSession.id,
      storedScript,
      {
        status: existingSession.status,
        topConcerns,
        proposedSlots: serializedSlots,
        tone,
        clientNewQuestion: clientQuestion
      }
    );

    await prisma.botCallSession.update({
      where: {
        id: existingSession.id
      },
      data: {
        prepBrief: serializeStoredPrepBrief(prepBrief)
      }
    });

    await prisma.notification.create({
      data: {
        agentId: input.agentId,
        type: "bot_followup_started",
        title: `${client.firstName} triggered another bot follow-up signal`,
        body: trimToLength(
          `Closing Day refreshed the existing follow-up session after a severity ${input.severity} question. Review the latest concern before reaching out.`,
          220
        ),
        relatedId: existingSession.id
      }
    });

    return {
      sessionId: existingSession.id,
      status: existingSession.status as VoiceBotSessionRecord["status"],
      createdNewSession: false
    };
  }

  const createdSession = await withSessionContext(
    await prisma.botCallSession.create({
      data: {
        transactionId: input.transactionId,
        clientAccountId: input.clientAccountId,
        agentId: input.agentId,
        status: "pending",
        topConcerns,
        proposedSlots: serializedSlots,
        tone,
        script: serializeStoredVoiceBotScript(storedScript),
        clientNewQuestion: clientQuestion,
        prepBrief: serializeStoredPrepBrief(prepBrief)
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

  const callSources = [
    `session:${createdSession.id}`,
    `transaction:${input.transactionId}`,
    `client:${client.id}`,
    `severity:${input.severity}`
  ];

  const callResult = client.phone
    ? await initiateOutboundCall({
        toNumber: client.phone,
        sources: callSources
      })
    : buildFallbackCallResult(
        "Closing Day staged the voice follow-up, but the client does not have a phone number saved on their profile.",
        callSources
      );

  let sessionStatus: VoiceBotSessionRecord["status"] = "pending";
  if (callResult.success) {
    await prisma.botCallSession.update({
      where: {
        id: createdSession.id
      },
      data: {
        status: "in_progress"
      }
    });

    sessionStatus = "in_progress";
  }

  await prisma.notification.create({
    data: {
      agentId: input.agentId,
      type: "bot_followup_started",
      title: `${client.firstName} triggered an automatic bot follow-up`,
      body: trimToLength(
        callResult.success
          ? `Closing Day started a live bot follow-up after a severity ${input.severity} question. Review the prep brief before you reassure the client about ${transaction.propertyAddress}.`
          : `Closing Day staged a bot follow-up after a severity ${input.severity} question, but the live call did not start. ${callResult.message}`,
        220
      ),
      relatedId: createdSession.id
    }
  });

  return {
    sessionId: createdSession.id,
    status: sessionStatus,
    createdNewSession: true,
    callResult
  };
}

export async function getVoiceBotSession(
  agentId: string,
  sessionId: string
): Promise<VoiceBotSessionRecord> {
  const session = await getSessionWithContext(agentId, sessionId);
  return hydrateVoiceBotSession(session);
}

export async function getLatestClientVoiceBotSession(
  transactionId: string,
  clientAccountId: string
): Promise<VoiceBotSessionRecord | undefined> {
  const session = await getLatestSessionWithContextForClient(transactionId, clientAccountId);
  if (!session) {
    return undefined;
  }

  return hydrateVoiceBotSession(session, { includeAudio: false });
}

export async function getTransactionVoiceBotSessionsForAgent(
  agentId: string,
  transactionId: string
): Promise<VoiceBotSessionRecord[]> {
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      agentId
    },
    include: {
      botSessions: {
        orderBy: {
          createdAt: "desc"
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
      }
    }
  });

  if (!transaction) {
    throw new Error("Transaction not found for this agent.");
  }

  const latestByClient = new Map<string, BotCallSession>();
  for (const session of transaction.botSessions) {
    if (!latestByClient.has(session.clientAccountId)) {
      latestByClient.set(session.clientAccountId, session);
    }
  }

  const hydratedSessions = await Promise.all(
    [...latestByClient.values()].map(async (session) => {
      const client = transaction.clientRoles.find(
        (clientRole) => clientRole.clientAccountId === session.clientAccountId
      )?.clientAccount;

      const sessionWithContext: VoiceBotSessionWithContext = {
        ...session,
        transaction: {
          propertyAddress: transaction.propertyAddress,
          propertyCity: transaction.propertyCity,
          propertyState: transaction.propertyState,
          propertyZip: transaction.propertyZip,
          stageLabel: transaction.stageLabel
        },
        clientAccount: {
          firstName: client?.firstName ?? "Client",
          lastName: client?.lastName ?? "Unknown"
        }
      };

      return hydrateVoiceBotSession(sessionWithContext, { includeAudio: false });
    })
  );

  return hydratedSessions.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
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

export async function respondToClientVoiceBotSession(
  input: RespondToClientVoiceBotInput
): Promise<VoiceBotSessionRecord> {
  const session = await getLatestSessionWithContextForClient(
    input.transactionId,
    input.clientAccountId,
    ["pending", "in_progress"]
  );

  if (!session) {
    throw new Error("No active Closing Day follow-up is open for this transaction.");
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
    throw new Error("This Closing Day follow-up is ready to confirm a booking.");
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

  return hydrateVoiceBotSession(updatedSession, { includeAudio: false });
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

export async function confirmClientVoiceBotSession(
  input: ConfirmClientVoiceBotInput
): Promise<VoiceBotSessionRecord> {
  const session = await getLatestSessionWithContextForClient(
    input.transactionId,
    input.clientAccountId,
    ["pending", "in_progress"]
  );

  if (!session) {
    throw new Error("No active Closing Day follow-up is open for this transaction.");
  }

  const result = await confirmVoiceBotSession({
    agentId: session.agentId,
    sessionId: session.id,
    bookedSlot: input.bookedSlot,
    ...(input.clientNewQuestion ? { clientNewQuestion: input.clientNewQuestion } : {})
  });

  return result;
}

export async function updateVoiceBotSessionSlots(
  input: UpdateVoiceBotSessionSlotsInput
): Promise<VoiceBotSessionRecord> {
  if (input.proposedSlots.length !== 3) {
    throw new Error("Exactly three proposed meeting slots are required.");
  }

  const session = await getSessionWithContext(input.agentId, input.sessionId);
  if (session.status === "booked" || session.status === "declined" || session.status === "failed") {
    throw new Error("Closed voice bot sessions can no longer change meeting slots.");
  }

  const transaction = await getTransactionContext(input.agentId, session.transactionId, session.clientAccountId);
  const client = transaction.clientRoles[0]?.clientAccount;
  if (!client) {
    throw new Error("Client was not found on this transaction.");
  }

  const concerns = parseJsonStringArray(session.topConcerns);
  const refreshedScript = await buildVoiceBotScript({
    agentFirstName: transaction.agent.firstName,
    clientFirstName: client.firstName,
    propertyAddress: transaction.propertyAddress,
    stageLabel: transaction.stageLabel,
    topConcerns: concerns,
    tone: session.tone as BotTone,
    proposedSlots: input.proposedSlots
  });

  const storedScript = parseStoredVoiceBotScript(session);
  const mergedTurns =
    storedScript.turns.length > 0
      ? replaceBotTurnsWithPlan(storedScript.turns, refreshedScript.plan)
      : buildInitialTranscript(refreshedScript.plan);

  const updatedSession = await saveSessionScript(
    session.id,
    {
      plan: refreshedScript.plan,
      turns: mergedTurns,
      generatedBy: refreshedScript.generatedBy,
      transparency: refreshedScript.transparency
    },
    {
      proposedSlots: JSON.stringify(input.proposedSlots),
      tone: session.tone
    }
  );

  return hydrateVoiceBotSession(updatedSession, { includeAudio: false });
}
