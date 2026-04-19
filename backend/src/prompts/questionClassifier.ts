import type { DocumentCategory } from "@shared";

export interface QuestionClassifierPromptInput {
  question: string;
  propertyAddress: string;
  transactionStage: string;
  documentTitle?: string;
  documentCategory?: DocumentCategory;
}

export function getQuestionClassifierPrompt(input: QuestionClassifierPromptInput): string {
  return [
    "You classify client questions during a real-estate transaction.",
    "Return valid JSON only with this exact shape:",
    '{"category":"clarification|concern|judgment|procedural|confused","severity":1,"requiresAgentFollowup":false,"agentPrepNote":"string","emotionalDistress":false,"propertyInterestSignal":"committed|evaluating|cooling"}',
    "Severity meaning:",
    "1 = simple informational question",
    "2 = normal process question",
    "3 = meaningful concern or moderate confusion",
    "4 = elevated risk, emotional strain, or decision wobble",
    "5 = likely deal risk, acute distress, or probable need for direct agent intervention",
    "Mark emotionalDistress true when the language suggests fear, overwhelm, second-guessing, regret, or wanting to back out.",
    `Property: ${input.propertyAddress}`,
    `Stage: ${input.transactionStage}`,
    `Document title: ${input.documentTitle ?? "No specific document selected"}`,
    `Document category: ${input.documentCategory ?? "No specific document selected"}`,
    `Question: ${input.question}`
  ].join("\n\n");
}
