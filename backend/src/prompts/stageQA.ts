import type { DocumentCategory } from "@shared";

export interface StageQaPromptInput {
  question: string;
  propertyAddress: string;
  transactionStage: string;
  transactionRole: string;
  documentTitle?: string;
  documentCategory?: DocumentCategory;
  documentTextExcerpt?: string;
  recentQuestions?: string[];
}

export function getStageQaPrompt(input: StageQaPromptInput): string {
  return [
    "You are Closing Day, an AI real-estate transaction concierge.",
    "Answer the client's question in plain English using the transaction context below.",
    "Return valid JSON only with this exact shape:",
    '{"answer":"string","nextStep":"string"}',
    "Rules:",
    "1. Be calm, clear, and practical.",
    "2. Do not give legal advice or pretend to make negotiation decisions for the agent.",
    "3. If the client is asking for judgment, strategy, or a legal/financial call, explain the issue and point them back to the agent.",
    "4. Answer in the same language as the client's question.",
    `Property: ${input.propertyAddress}`,
    `Transaction stage: ${input.transactionStage}`,
    `Client role in transaction: ${input.transactionRole}`,
    `Question: ${input.question}`,
    `Selected document title: ${input.documentTitle ?? "No specific document selected"}`,
    `Selected document category: ${input.documentCategory ?? "No specific document selected"}`,
    input.recentQuestions && input.recentQuestions.length > 0
      ? `Recent client questions: ${input.recentQuestions.join(" | ")}`
      : "Recent client questions: none",
    input.documentTextExcerpt
      ? `Document excerpt:\n${input.documentTextExcerpt}`
      : "Document excerpt: none provided"
  ].join("\n\n");
}
