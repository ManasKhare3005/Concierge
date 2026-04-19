import type {
  AiTransparency,
  GeneratedBy,
  PropertyInterestSignal,
  QuestionCategory,
  ReadinessBucket,
  ReadinessSnapshotRecord,
  SentimentLabel
} from "@shared";
import { z } from "zod";

import { runGroqTask } from "../../lib/groq";
import { logger } from "../../lib/logger";
import { bucketReadinessScore } from "../triage/bucketer";

interface ReadinessQuestionSignal {
  question: string;
  category: QuestionCategory;
  severity: number;
  emotionalDistress: boolean;
  propertyInterestSignal: PropertyInterestSignal;
  routedToAgent: boolean;
}

interface ReadinessSentimentSignal {
  question: string;
  response: string;
  sentiment: SentimentLabel;
  agentAlertNeeded: boolean;
  alertReason: string;
  recommendedAgentAction: string;
}

export interface ReadinessComputerInput {
  transactionId: string;
  clientAccountId: string;
  propertyAddress: string;
  transactionStage: string;
  recentQuestions: ReadinessQuestionSignal[];
  recentSentiments: ReadinessSentimentSignal[];
  latestPropertyInterestSignal?: PropertyInterestSignal;
}

export interface ReadinessComputationResult {
  snapshot: Omit<ReadinessSnapshotRecord, "id" | "computedAt">;
  generatedBy: GeneratedBy;
  transparency: AiTransparency;
}

const readinessSchema = z.object({
  bucket: z.enum(["clear", "needs_light_touch", "needs_full_attention"]),
  reasoning: z.string().min(20),
  topConcerns: z.array(z.string().min(4)).min(1),
  propertyInterestSignal: z.enum(["committed", "evaluating", "cooling"]),
  recommendedAgentAction: z.string().min(12)
});

function trimToLength(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trim()}...`;
}

function stripCodeFences(responseText: string): string {
  return responseText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function extractConcernTags(text: string): string[] {
  const normalized = text.toLowerCase();
  const concerns: string[] = [];

  if (normalized.includes("earnest")) {
    concerns.push("earnest money risk");
  }
  if (normalized.includes("inspection") || normalized.includes("roof") || normalized.includes("foundation")) {
    concerns.push("inspection findings");
  }
  if (normalized.includes("closing") || normalized.includes("timeline") || normalized.includes("deadline")) {
    concerns.push("closing timeline");
  }
  if (normalized.includes("title") || normalized.includes("escrow") || normalized.includes("lien")) {
    concerns.push("title or escrow");
  }
  if (normalized.includes("financ") || normalized.includes("loan") || normalized.includes("mortgage")) {
    concerns.push("financing approval");
  }
  if (normalized.includes("cost") || normalized.includes("fee") || normalized.includes("price")) {
    concerns.push("unexpected costs");
  }
  if (
    normalized.includes("walk away") ||
    normalized.includes("back out") ||
    normalized.includes("changed my mind") ||
    normalized.includes("don't want this")
  ) {
    concerns.push("possible withdrawal");
  }
  if (normalized.includes("hoa") || normalized.includes("dues")) {
    concerns.push("HOA constraints");
  }

  return concerns;
}

function buildFallbackSnapshot(input: ReadinessComputerInput) {
  const latestQuestion = input.recentQuestions[0];
  const latestSentiment = input.recentSentiments[0];
  const propertyInterestSignal =
    input.latestPropertyInterestSignal ??
    latestQuestion?.propertyInterestSignal ??
    (latestSentiment?.sentiment === "anxious" ? "evaluating" : "committed");

  let score = 0;

  if (latestQuestion) {
    score += latestQuestion.severity;
    if (latestQuestion.routedToAgent) {
      score += 2;
    }
    if (latestQuestion.emotionalDistress) {
      score += 3;
    }
    if (latestQuestion.category === "judgment") {
      score += 2;
    }
  }

  if (latestSentiment) {
    switch (latestSentiment.sentiment) {
      case "calm":
        score -= 1;
        break;
      case "curious":
        score += 1;
        break;
      case "confused":
        score += 2;
        break;
      case "anxious":
        score += 3;
        break;
      case "frustrated":
        score += 4;
        break;
      case "overwhelmed":
        score += 5;
        break;
      default:
        break;
    }

    if (latestSentiment.agentAlertNeeded) {
      score += 2;
    }
  }

  if (propertyInterestSignal === "evaluating") {
    score += 2;
  }
  if (propertyInterestSignal === "cooling") {
    score += 4;
  }

  const bucket = bucketReadinessScore(score);
  const topConcerns = uniqueStrings([
    ...(latestQuestion ? extractConcernTags(latestQuestion.question) : []),
    ...(latestSentiment ? extractConcernTags(`${latestSentiment.question} ${latestSentiment.response}`) : [])
  ]).slice(0, 3);

  const fallbackConcerns =
    topConcerns.length > 0
      ? topConcerns
      : bucket === "clear"
        ? ["routine process updates"]
        : bucket === "needs_light_touch"
          ? ["clarity and reassurance"]
          : ["high-stakes decision support"];

  const reasoning =
    bucket === "needs_full_attention"
      ? `The client is showing a mix of elevated question severity, ${latestSentiment?.sentiment ?? "concern"}, and a ${propertyInterestSignal} interest signal, so they should not be left on self-serve.`
      : bucket === "needs_light_touch"
        ? `The client is still engaged, but their latest signals suggest they need a targeted explanation or short follow-up from the agent soon.`
        : `The client is asking routine questions and their latest tone reads stable enough to stay in a mostly self-serve flow.`;

  const recommendedAgentAction =
    bucket === "needs_full_attention"
      ? "Reach out today, clarify the top concern, and move the client from uncertainty into a live conversation."
      : bucket === "needs_light_touch"
        ? "Send a concise, confidence-building follow-up and monitor the next client action."
        : "Keep the experience proactive but lightweight and reserve live time for higher-risk clients.";

  return {
    bucket,
    reasoning: trimToLength(reasoning, 260),
    topConcerns: fallbackConcerns,
    propertyInterestSignal,
    recommendedAgentAction: trimToLength(recommendedAgentAction, 220)
  };
}

function buildPrompt(input: ReadinessComputerInput): string {
  return [
    "You are computing real-estate client readiness for an agent triage dashboard.",
    "Return valid JSON only with this exact shape:",
    '{"bucket":"clear|needs_light_touch|needs_full_attention","reasoning":"string","topConcerns":["string"],"propertyInterestSignal":"committed|evaluating|cooling","recommendedAgentAction":"string"}',
    "The output should reflect whether the agent can safely stay hands-off, should send a short follow-up, or needs to intervene directly.",
    `Property: ${input.propertyAddress}`,
    `Transaction stage: ${input.transactionStage}`,
    `Recent questions: ${input.recentQuestions.map((question) => `${question.category}/${question.severity}: ${question.question}`).join(" | ") || "none"}`,
    `Recent sentiments: ${input.recentSentiments.map((sentiment) => `${sentiment.sentiment}: ${sentiment.alertReason}`).join(" | ") || "none"}`,
    `Latest property-interest signal hint: ${input.latestPropertyInterestSignal ?? "unknown"}`
  ].join("\n\n");
}

export async function computeReadiness(
  input: ReadinessComputerInput
): Promise<ReadinessComputationResult> {
  const fallback = buildFallbackSnapshot(input);

  const result = await runGroqTask({
    taskName: "Readiness computer",
    system:
      "You help a real-estate agent triage clients. You return valid JSON only and do not overreact to routine questions.",
    prompt: buildPrompt(input),
    sources: [
      `property:${input.propertyAddress}`,
      `stage:${input.transactionStage}`,
      `transaction:${input.transactionId}`,
      `client:${input.clientAccountId}`
    ],
    fallback: () => fallback,
    parse: (responseText) => {
      const parsed = readinessSchema.parse(JSON.parse(stripCodeFences(responseText)) as unknown);
      return {
        bucket: parsed.bucket,
        reasoning: trimToLength(parsed.reasoning, 260),
        topConcerns: uniqueStrings(parsed.topConcerns).slice(0, 3),
        propertyInterestSignal: parsed.propertyInterestSignal,
        recommendedAgentAction: trimToLength(parsed.recommendedAgentAction, 220)
      };
    }
  });

  if (result.generatedBy === "fallback") {
    logger.warn("Readiness computer used fallback", {
      propertyAddress: input.propertyAddress,
      transactionStage: input.transactionStage
    });
  }

  return {
    snapshot: {
      transactionId: input.transactionId,
      clientAccountId: input.clientAccountId,
      bucket: result.bucket,
      reasoning: result.reasoning,
      topConcerns: result.topConcerns,
      propertyInterestSignal: result.propertyInterestSignal,
      recommendedAgentAction: result.recommendedAgentAction
    },
    generatedBy: result.generatedBy,
    transparency: result.transparency
  };
}
