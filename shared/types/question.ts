import type { AiTransparency, GeneratedBy } from "./document";

export type QuestionCategory =
  | "clarification"
  | "concern"
  | "judgment"
  | "procedural"
  | "confused";

export type PropertyInterestSignal = "committed" | "evaluating" | "cooling";

export interface QuestionRecord {
  id: string;
  transactionId: string;
  clientAccountId: string;
  documentId?: string;
  question: string;
  answer: string;
  nextStep?: string;
  category: QuestionCategory;
  severity: number;
  requiresAgentFollowup: boolean;
  agentPrepNote: string;
  emotionalDistress: boolean;
  propertyInterestSignal: PropertyInterestSignal;
  routedToAgent: boolean;
  generatedBy: GeneratedBy;
  transparency: AiTransparency;
  editedByAgent: boolean;
  askedAt: string;
}
