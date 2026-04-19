import type {
  AiTransparency,
  DocumentCategory,
  GeneratedBy,
  PropertyInterestSignal,
  QuestionCategory
} from "@shared";
import { z } from "zod";

import { runGroqTask } from "../../lib/groq";
import { logger } from "../../lib/logger";
import { getQuestionClassifierPrompt } from "../../prompts/questionClassifier";

export interface QuestionClassifierInput {
  question: string;
  propertyAddress: string;
  transactionStage: string;
  documentTitle?: string;
  documentCategory?: DocumentCategory;
}

export interface QuestionClassificationResult {
  category: QuestionCategory;
  severity: number;
  requiresAgentFollowup: boolean;
  agentPrepNote: string;
  emotionalDistress: boolean;
  propertyInterestSignal: PropertyInterestSignal;
  routedToAgent: boolean;
  generatedBy: GeneratedBy;
  transparency: AiTransparency;
}

const questionClassifierSchema = z.object({
  category: z.enum(["clarification", "concern", "judgment", "procedural", "confused"]),
  severity: z.number().int().min(1).max(5),
  requiresAgentFollowup: z.boolean(),
  agentPrepNote: z.string().min(12),
  emotionalDistress: z.boolean(),
  propertyInterestSignal: z.enum(["committed", "evaluating", "cooling"])
});

function trimToLength(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trim()}...`;
}

function stripCodeFences(responseText: string): string {
  return responseText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function classifyFallback(input: QuestionClassifierInput) {
  const normalized = input.question.toLowerCase();
  const coolingPattern =
    /changed my mind|walk away|back out|i don't think i want|i do not think i want|don't want this house|do not want this house|regret/i;
  const evaluatingPattern = /not sure|unsure|second guess|on the fence|maybe we should not|hesitant/i;
  const distressedPattern =
    /worried|anxious|nervous|scared|stress|overwhelmed|panic|freaking out|can'?t sleep|do not feel good/i;
  const confusedPattern = /confused|don't understand|do not understand|what does .* mean|not sure what .* means|unsure what/i;
  const judgmentPattern =
    /should|worth it|push back|renegotiat|price|credit|ask for|walk away|back out|changed my mind|on the fence|second guess/i;
  const proceduralPattern = /when|what happens|how long|timeline|closing|sign|keys|next step|wire|notice|schedule/i;
  const concernPattern = /issue|problem|roof|foundation|crack|mold|water|leak|termite|lose|risk|expensive|cost|earnest/i;
  const clarificationPattern = /what is|what does|mean|explain|help me understand/i;

  const propertyInterestSignal: PropertyInterestSignal = coolingPattern.test(normalized)
    ? "cooling"
    : evaluatingPattern.test(normalized)
      ? "evaluating"
      : "committed";

  const emotionalDistress =
    distressedPattern.test(normalized) ||
    coolingPattern.test(normalized) ||
    /second guess|on the fence|walk away|back out/i.test(normalized);

  let category: QuestionCategory = "clarification";
  if (judgmentPattern.test(normalized)) {
    category = "judgment";
  } else if (confusedPattern.test(normalized)) {
    category = "confused";
  } else if (concernPattern.test(normalized)) {
    category = "concern";
  } else if (proceduralPattern.test(normalized)) {
    category = "procedural";
  } else if (!clarificationPattern.test(normalized)) {
    category = "clarification";
  }

  let severity = 2;
  if (category === "clarification") {
    severity = 1;
  }
  if (category === "procedural" || category === "confused") {
    severity = 2;
  }
  if (category === "concern" || category === "judgment") {
    severity = 3;
  }
  if (propertyInterestSignal === "evaluating" || emotionalDistress) {
    severity = Math.max(severity, 4);
  }
  if (propertyInterestSignal === "cooling" || /walk away|back out|changed my mind|don't want this house/i.test(normalized)) {
    severity = 5;
  }

  const requiresAgentFollowup =
    category === "judgment" ||
    emotionalDistress ||
    severity >= 4 ||
    /legal|lawsuit|sue|breach|lose earnest|financing failed/i.test(normalized);
  const routedToAgent = requiresAgentFollowup || severity >= 4 || emotionalDistress;

  return {
    category,
    severity,
    requiresAgentFollowup,
    agentPrepNote: trimToLength(
      `Client asked a ${category} question during ${input.transactionStage}. Interest signal looks ${propertyInterestSignal}, severity is ${severity}, and${requiresAgentFollowup ? "" : " no"} immediate agent follow-up is recommended.`,
      220
    ),
    emotionalDistress,
    propertyInterestSignal,
    routedToAgent
  };
}

export async function classifyQuestion(input: QuestionClassifierInput): Promise<QuestionClassificationResult> {
  const fallback = classifyFallback(input);

  const result = await runGroqTask({
    taskName: "Question classifier",
    system:
      "You classify client questions for a real-estate agent. You return valid JSON only and stay consistent with the severity rules provided.",
    prompt: getQuestionClassifierPrompt({
      question: input.question,
      propertyAddress: input.propertyAddress,
      transactionStage: input.transactionStage,
      ...(input.documentTitle ? { documentTitle: input.documentTitle } : {}),
      ...(input.documentCategory ? { documentCategory: input.documentCategory } : {})
    }),
    sources: [
      `question:${trimToLength(input.question, 80)}`,
      `property:${input.propertyAddress}`,
      `stage:${input.transactionStage}`
    ],
    fallback: () => fallback,
    parse: (responseText) => {
      const parsed = questionClassifierSchema.parse(JSON.parse(stripCodeFences(responseText)) as unknown);
      const severity = Math.max(1, Math.min(5, parsed.severity));
      const routedToAgent =
        parsed.requiresAgentFollowup || parsed.emotionalDistress || severity >= 4 || parsed.category === "judgment";

      return {
        category: parsed.category,
        severity,
        requiresAgentFollowup: parsed.requiresAgentFollowup,
        agentPrepNote: trimToLength(parsed.agentPrepNote, 220),
        emotionalDistress: parsed.emotionalDistress,
        propertyInterestSignal: parsed.propertyInterestSignal,
        routedToAgent
      };
    }
  });

  if (result.generatedBy === "fallback") {
    logger.warn("Question classifier used fallback", {
      propertyAddress: input.propertyAddress,
      transactionStage: input.transactionStage
    });
  }

  return result;
}
