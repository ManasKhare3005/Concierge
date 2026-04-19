import type { AiTransparency, GeneratedBy, PropertyInterestSignal, SentimentLabel } from "@shared";
import { z } from "zod";

import { runGroqTask } from "../../lib/groq";
import { logger } from "../../lib/logger";
import { getSentimentAnalyzerPrompt } from "../../prompts/sentimentAnalyzer";

export interface SentimentAnalyzerInput {
  source: "question" | "check_in";
  propertyAddress: string;
  transactionStage: string;
  question: string;
  response: string;
  severityHint?: number;
  emotionalDistressHint?: boolean;
  propertyInterestSignalHint?: PropertyInterestSignal;
}

export interface SentimentAnalysisResult {
  sentiment: SentimentLabel;
  confidence: number;
  agentAlertNeeded: boolean;
  alertReason: string;
  recommendedAgentAction: string;
  propertyInterestSignal: PropertyInterestSignal;
  generatedBy: GeneratedBy;
  transparency: AiTransparency;
}

const sentimentSchema = z.object({
  sentiment: z.enum(["calm", "curious", "excited", "anxious", "confused", "frustrated", "overwhelmed"]),
  confidence: z.number().min(0).max(1),
  agentAlertNeeded: z.boolean(),
  alertReason: z.string().min(10),
  recommendedAgentAction: z.string().min(12),
  propertyInterestSignal: z.enum(["committed", "evaluating", "cooling"])
});

function trimToLength(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trim()}...`;
}

function stripCodeFences(responseText: string): string {
  return responseText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function analyzeFallback(input: SentimentAnalyzerInput) {
  const normalized = `${input.question} ${input.response}`.toLowerCase();
  const coolingPattern =
    /changed my mind|walk away|back out|i don't think i want|i do not think i want|don't want this house|do not want this house|regret/i;
  const evaluatingPattern = /not sure|unsure|second guess|on the fence|hesitant/i;
  const overwhelmedPattern = /overwhelmed|panic|can't do this|too much|freaking out/i;
  const frustratedPattern = /frustrated|annoyed|upset|angry|why is this so hard/i;
  const anxiousPattern = /worried|anxious|nervous|scared|stress|afraid|uneasy/i;
  const confusedPattern = /confused|don't understand|do not understand|what does .* mean|lost/i;
  const excitedPattern = /excited|love this|can't wait|ready to close|thrilled/i;
  const curiousPattern = /what happens|how does|curious|wondering|can you explain/i;

  const propertyInterestSignal: PropertyInterestSignal = coolingPattern.test(normalized)
    ? "cooling"
    : evaluatingPattern.test(normalized)
      ? "evaluating"
      : input.propertyInterestSignalHint ?? "committed";

  let sentiment: SentimentLabel = "calm";
  if (overwhelmedPattern.test(normalized)) {
    sentiment = "overwhelmed";
  } else if (frustratedPattern.test(normalized)) {
    sentiment = "frustrated";
  } else if (anxiousPattern.test(normalized) || propertyInterestSignal !== "committed") {
    sentiment = "anxious";
  } else if (confusedPattern.test(normalized)) {
    sentiment = "confused";
  } else if (excitedPattern.test(normalized)) {
    sentiment = "excited";
  } else if (curiousPattern.test(normalized) || input.source === "question") {
    sentiment = "curious";
  }

  const confidence = sentiment === "calm" ? 0.69 : sentiment === "curious" ? 0.74 : 0.86;
  const agentAlertNeeded =
    input.emotionalDistressHint === true ||
    (input.severityHint ?? 0) >= 4 ||
    sentiment === "anxious" ||
    sentiment === "frustrated" ||
    sentiment === "overwhelmed" ||
    propertyInterestSignal !== "committed";

  const alertReason = agentAlertNeeded
    ? sentiment === "overwhelmed"
      ? "The client sounds overloaded and likely needs a live reset with the agent."
      : propertyInterestSignal === "cooling"
        ? "The client is signaling possible withdrawal or regret, which raises deal-risk."
        : "The client is showing enough anxiety or uncertainty that self-serve support may not be enough."
    : "The client sounds stable and does not currently show signs of urgent distress.";

  const recommendedAgentAction = agentAlertNeeded
    ? propertyInterestSignal === "cooling"
      ? "Call the client soon, clarify their biggest fear, and review the real contract options before momentum drops."
      : "Send a targeted follow-up and be prepared to move to a live call if the next question stays high-stress."
    : "Keep the conversation warm and concise, and let the client continue in self-serve unless the tone shifts.";

  return {
    sentiment,
    confidence,
    agentAlertNeeded,
    alertReason,
    recommendedAgentAction,
    propertyInterestSignal
  };
}

export async function analyzeClientSentiment(
  input: SentimentAnalyzerInput
): Promise<SentimentAnalysisResult> {
  const fallback = analyzeFallback(input);

  const result = await runGroqTask({
    taskName: "Sentiment analyzer",
    system:
      "You analyze emotion in a real-estate transaction. You return valid JSON only and stay grounded in the provided text.",
    prompt: getSentimentAnalyzerPrompt({
      source: input.source,
      propertyAddress: input.propertyAddress,
      transactionStage: input.transactionStage,
      question: input.question,
      response: input.response
    }),
    sources: [
      `property:${input.propertyAddress}`,
      `stage:${input.transactionStage}`,
      `message:${trimToLength(input.question, 80)}`
    ],
    fallback: () => fallback,
    parse: (responseText) => {
      const parsed = sentimentSchema.parse(JSON.parse(stripCodeFences(responseText)) as unknown);
      return {
        sentiment: parsed.sentiment,
        confidence: Number(parsed.confidence.toFixed(2)),
        agentAlertNeeded: parsed.agentAlertNeeded,
        alertReason: trimToLength(parsed.alertReason, 220),
        recommendedAgentAction: trimToLength(parsed.recommendedAgentAction, 220),
        propertyInterestSignal: parsed.propertyInterestSignal
      };
    }
  });

  if (result.generatedBy === "fallback") {
    logger.warn("Sentiment analyzer used fallback", {
      propertyAddress: input.propertyAddress,
      transactionStage: input.transactionStage,
      source: input.source
    });
  }

  return result;
}
