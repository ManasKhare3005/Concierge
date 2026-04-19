import type { AiTransparency, GeneratedBy } from "./document";

export type BotSessionStatus = "pending" | "in_progress" | "booked" | "declined" | "failed";
export type BotTone = "warm" | "brief" | "detailed";

export interface BotScriptTurn {
  speaker: "bot" | "client";
  text: string;
}

export interface BotVoicePlayback {
  audioBase64?: string;
  mimeType: "audio/mpeg";
  generatedBy: "elevenlabs" | "fallback";
  transparency: AiTransparency;
}

export interface VoiceBotPrepBrief {
  text: string;
  generatedBy: GeneratedBy;
  transparency: AiTransparency;
}

export interface VoiceBotSessionRecord {
  id: string;
  transactionId: string;
  clientAccountId: string;
  agentId: string;
  clientName: string;
  clientFirstName: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  stageLabel: string;
  status: BotSessionStatus;
  topConcerns: string[];
  proposedSlots: string[];
  tone: BotTone;
  script: BotScriptTurn[];
  responseOptions: string[];
  canConfirmBooking: boolean;
  currentBotTurn?: BotScriptTurn;
  currentBotAudio?: BotVoicePlayback;
  bookedSlot?: string;
  clientNewQuestion?: string;
  prepBrief?: VoiceBotPrepBrief;
  generatedBy: GeneratedBy;
  transparency: AiTransparency;
  createdAt: string;
  concludedAt?: string;
}
