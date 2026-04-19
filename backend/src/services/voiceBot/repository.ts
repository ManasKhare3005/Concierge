import type {
  AiTransparency,
  BotScriptTurn,
  GeneratedBy,
  VoiceBotPrepBrief
} from "@shared";
import type { BotCallSession } from "@prisma/client";
import { z } from "zod";

const transparencySchema = z.object({
  sources: z.array(z.string()),
  note: z.string()
});

const botScriptTurnSchema = z.object({
  speaker: z.enum(["bot", "client"]),
  text: z.string().min(1)
});

const storedScriptSchema = z.object({
  plan: z.array(z.string().min(1)),
  turns: z.array(botScriptTurnSchema),
  generatedBy: z.enum(["groq", "fallback"]),
  transparency: transparencySchema
});

const storedPrepBriefSchema = z.object({
  text: z.string().min(1),
  generatedBy: z.enum(["groq", "fallback"]),
  transparency: transparencySchema
});

export interface StoredVoiceBotScript {
  plan: string[];
  turns: BotScriptTurn[];
  generatedBy: GeneratedBy;
  transparency: AiTransparency;
}

function trimToLength(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trim()}...`;
}

function fallbackTransparency(sessionId: string): AiTransparency {
  return {
    sources: [`session:${sessionId}`],
    note: "Fallback voice-bot script metadata was reconstructed from the stored session."
  };
}

export function parseJsonStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    return [];
  }

  return [];
}

export function parseStoredVoiceBotScript(session: BotCallSession): StoredVoiceBotScript {
  try {
    const parsed = JSON.parse(session.script) as unknown;
    const envelope = storedScriptSchema.safeParse(parsed);
    if (envelope.success) {
      return envelope.data;
    }

    const legacyTurns = z.array(botScriptTurnSchema).safeParse(parsed);
    if (legacyTurns.success) {
      const plan = legacyTurns.data
        .filter((turn) => turn.speaker === "bot")
        .map((turn) => trimToLength(turn.text, 280));

      return {
        plan,
        turns: legacyTurns.data,
        generatedBy: "fallback",
        transparency: fallbackTransparency(session.id)
      };
    }
  } catch {
    return {
      plan: [],
      turns: [],
      generatedBy: "fallback",
      transparency: fallbackTransparency(session.id)
    };
  }

  return {
    plan: [],
    turns: [],
    generatedBy: "fallback",
    transparency: fallbackTransparency(session.id)
  };
}

export function serializeStoredVoiceBotScript(script: StoredVoiceBotScript): string {
  return JSON.stringify(script);
}

export function parseStoredPrepBrief(value: string | null): VoiceBotPrepBrief | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    const envelope = storedPrepBriefSchema.safeParse(parsed);
    if (envelope.success) {
      return envelope.data;
    }
  } catch {
    return {
      text: value,
      generatedBy: "fallback",
      transparency: {
        sources: ["prep-brief:legacy"],
        note: "Fallback prep-brief metadata was reconstructed from a legacy stored string."
      }
    };
  }

  return undefined;
}

export function serializeStoredPrepBrief(prepBrief: VoiceBotPrepBrief): string {
  return JSON.stringify(prepBrief);
}
