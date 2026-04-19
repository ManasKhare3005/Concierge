import type { AiTransparency, GeneratedBy } from "./document";

export type SentimentLabel =
  | "calm"
  | "curious"
  | "excited"
  | "anxious"
  | "confused"
  | "frustrated"
  | "overwhelmed";

export interface SentimentSnapshot {
  id: string;
  transactionId: string;
  clientAccountId: string;
  question: string;
  response: string;
  sentiment: SentimentLabel;
  confidence: number;
  agentAlertNeeded: boolean;
  alertReason: string;
  recommendedAgentAction: string;
  derivedFromQuestionId?: string;
  generatedBy: GeneratedBy;
  transparency: AiTransparency;
  createdAt: string;
}
