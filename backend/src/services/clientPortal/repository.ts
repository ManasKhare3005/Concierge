import type {
  AiTransparency,
  GeneratedBy,
  PropertyInterestSignal,
  QuestionRecord,
  ReadinessSnapshotRecord,
  SentimentSnapshot
} from "@shared";
import type { Question, ReadinessSnapshot, SentimentEntry } from "@prisma/client";

function normalizeGeneratedBy(value: string): GeneratedBy {
  return value === "groq" ? "groq" : "fallback";
}

function trimToLength(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trim()}...`;
}

function parseTopConcerns(topConcerns: string): string[] {
  try {
    const parsed = JSON.parse(topConcerns) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string").slice(0, 3);
    }
  } catch {
    return [topConcerns].filter(Boolean);
  }

  return [];
}

interface QuestionLike extends Question {
  document?: {
    title: string;
  } | null;
  transaction?: {
    propertyAddress: string;
    stageLabel: string;
  };
}

interface SentimentLike extends SentimentEntry {
  transaction?: {
    propertyAddress: string;
    stageLabel: string;
  };
}

function buildQuestionTransparency(question: QuestionLike): AiTransparency {
  const generatedBy = normalizeGeneratedBy(question.generatedBy);

  return {
    sources: [
      `question:${trimToLength(question.question, 80)}`,
      question.document ? `document:${question.document.title}` : "document:none",
      question.transaction ? `property:${question.transaction.propertyAddress}` : "property:unknown"
    ],
    note: question.routedToAgent
      ? "This answer was paired with routing logic because the question may need agent judgment or follow-up."
      : generatedBy === "groq"
        ? "Groq answered this question using the transaction context and available document information."
        : "A question-aware fallback response was used because live AI was unavailable."
  };
}

function buildSentimentTransparency(sentiment: SentimentLike): AiTransparency {
  const generatedBy = normalizeGeneratedBy(sentiment.generatedBy);

  return {
    sources: [
      `question:${trimToLength(sentiment.question, 80)}`,
      sentiment.transaction ? `property:${sentiment.transaction.propertyAddress}` : "property:unknown"
    ],
    note: sentiment.derivedFromQuestionId
      ? "This sentiment was synthesized from the client's latest question so emotional signals still update the agent view."
      : generatedBy === "groq"
        ? "Groq analyzed the client's tone and urgency from the latest interaction."
        : "A fallback sentiment heuristic was used for this interaction."
  };
}

export function mapQuestionRecord(question: QuestionLike): QuestionRecord {
  return {
    id: question.id,
    transactionId: question.transactionId,
    clientAccountId: question.clientAccountId,
    ...(question.documentId ? { documentId: question.documentId } : {}),
    question: question.question,
    answer: question.answer,
    ...(question.nextStep ? { nextStep: question.nextStep } : {}),
    category: question.category as QuestionRecord["category"],
    severity: question.severity,
    requiresAgentFollowup: question.requiresAgentFollowup,
    agentPrepNote: question.agentPrepNote,
    emotionalDistress: question.emotionalDistress,
    propertyInterestSignal: question.propertyInterestSignal as PropertyInterestSignal,
    routedToAgent: question.routedToAgent,
    generatedBy: normalizeGeneratedBy(question.generatedBy),
    transparency: buildQuestionTransparency(question),
    editedByAgent: question.editedByAgent,
    askedAt: question.askedAt.toISOString()
  };
}

export function mapSentimentEntry(sentiment: SentimentLike): SentimentSnapshot {
  return {
    id: sentiment.id,
    transactionId: sentiment.transactionId,
    clientAccountId: sentiment.clientAccountId,
    question: sentiment.question,
    response: sentiment.response,
    sentiment: sentiment.sentiment as SentimentSnapshot["sentiment"],
    confidence: Number(sentiment.confidence.toFixed(2)),
    agentAlertNeeded: sentiment.agentAlertNeeded,
    alertReason: sentiment.alertReason,
    recommendedAgentAction: sentiment.recommendedAgentAction,
    ...(sentiment.derivedFromQuestionId ? { derivedFromQuestionId: sentiment.derivedFromQuestionId } : {}),
    generatedBy: normalizeGeneratedBy(sentiment.generatedBy),
    transparency: buildSentimentTransparency(sentiment),
    createdAt: sentiment.createdAt.toISOString()
  };
}

export function mapReadinessSnapshot(readiness: ReadinessSnapshot): ReadinessSnapshotRecord {
  return {
    id: readiness.id,
    transactionId: readiness.transactionId,
    clientAccountId: readiness.clientAccountId,
    bucket: readiness.bucket as ReadinessSnapshotRecord["bucket"],
    reasoning: readiness.reasoning,
    topConcerns: parseTopConcerns(readiness.topConcerns),
    propertyInterestSignal: readiness.propertyInterestSignal as PropertyInterestSignal,
    recommendedAgentAction: readiness.recommendedAgentAction,
    computedAt: readiness.computedAt.toISOString()
  };
}
