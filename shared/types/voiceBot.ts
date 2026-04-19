import type { AiTransparency, GeneratedBy } from "./document";

export type BotSessionStatus = "pending" | "in_progress" | "booked" | "declined" | "failed";
export type BotTone = "warm" | "brief" | "detailed";

export interface BotScriptTurn {
  speaker: "bot" | "client";
  text: string;
}

export interface VoiceBotSessionRecord {
  id: string;
  transactionId: string;
  clientAccountId: string;
  agentId: string;
  status: BotSessionStatus;
  topConcerns: string[];
  proposedSlots: string[];
  tone: BotTone;
  script: BotScriptTurn[];
  bookedSlot?: string;
  clientNewQuestion?: string;
  prepBrief?: string;
  generatedBy: GeneratedBy;
  transparency: AiTransparency;
  createdAt: string;
  concludedAt?: string;
}
