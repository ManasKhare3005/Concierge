import type { AiTransparency, GeneratedBy } from "./document";

export type BotSessionStatus = "pending" | "in_progress" | "booked" | "declined" | "failed";
export type BotTone = "warm" | "brief" | "detailed";
export const ARIZONA_TIME_ZONE = "America/Phoenix";

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

function formatSlotParts(slot: string, locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: ARIZONA_TIME_ZONE,
    ...options
  }).format(new Date(slot));
}

export function formatVoiceBotSlotLabel(slot: string, language: "en" | "es" = "en"): string {
  return formatSlotParts(slot, language === "es" ? "es-US" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function formatVoiceBotSlotForPrompt(slot: string): string {
  return formatSlotParts(slot, "en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function toArizonaDateTimeInputValue(slot: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARIZONA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date(slot));

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${lookup["year"]}-${lookup["month"]}-${lookup["day"]}T${lookup["hour"]}:${lookup["minute"]}`;
}

export function fromArizonaDateTimeInputValue(value: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return undefined;
  }

  return new Date(`${value}:00-07:00`).toISOString();
}
