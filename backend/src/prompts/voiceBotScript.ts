import type { BotTone } from "@shared";

interface VoiceBotScriptPromptInput {
  agentFirstName: string;
  clientFirstName: string;
  propertyAddress: string;
  stageLabel: string;
  topConcerns: string[];
  tone: BotTone;
  proposedSlots: string[];
}

export function getVoiceBotScriptPrompt(input: VoiceBotScriptPromptInput): string {
  return [
    "You are writing a concise simulated outbound real-estate support call.",
    "Return valid JSON only with this exact shape:",
    '{"plan":["bot line 1","bot line 2","bot line 3"]}',
    "Rules:",
    "- The bot is calling on behalf of the agent named below.",
    "- The bot should sound calm, practical, and trust-building.",
    "- Each line should be short enough to say aloud naturally.",
    "- Line 1 should open the call and invite the client to name the biggest concern.",
    "- Line 2 should narrow the issue and prepare the client for a focused agent conversation.",
    "- Line 3 should tee up booking one of the proposed meeting slots.",
    `Agent first name: ${input.agentFirstName}`,
    `Client first name: ${input.clientFirstName}`,
    `Property: ${input.propertyAddress}`,
    `Stage: ${input.stageLabel}`,
    `Tone: ${input.tone}`,
    `Top concerns: ${input.topConcerns.join(" | ")}`,
    `Proposed slots: ${input.proposedSlots.join(" | ")}`
  ].join("\n\n");
}
