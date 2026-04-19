import type { AiTransparency, BotTone, GeneratedBy } from "@shared";
import { formatVoiceBotSlotForPrompt } from "@shared";
import { z } from "zod";

import { runGroqTask } from "../../lib/groq";
import { logger } from "../../lib/logger";
import { getVoiceBotScriptPrompt } from "../../prompts/voiceBotScript";

export interface VoiceBotScripterInput {
  agentFirstName: string;
  clientFirstName: string;
  propertyAddress: string;
  stageLabel: string;
  topConcerns: string[];
  tone: BotTone;
  proposedSlots: string[];
}

export interface VoiceBotScripterResult {
  plan: string[];
  generatedBy: GeneratedBy;
  transparency: AiTransparency;
}

const voiceBotPlanSchema = z.object({
  plan: z.array(z.string().min(12)).min(3)
});

function trimToLength(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trim()}...`;
}

function stripCodeFences(responseText: string): string {
  return responseText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function formatConcernList(concerns: string[]): string {
  const [first = "the next steps", second = "decision confidence", third = "timeline clarity"] = concerns;

  if (concerns.length === 0) {
    return "the next steps and how to feel confident moving forward";
  }

  if (concerns.length === 1) {
    return first;
  }

  if (concerns.length === 2) {
    return `${first} and ${second}`;
  }

  return `${first}, ${second}, and ${third}`;
}

function buildFallbackPlan(input: VoiceBotScripterInput): string[] {
  const concernText = formatConcernList(input.topConcerns.slice(0, 3));
  const slotLabels = input.proposedSlots.map((slot) => formatVoiceBotSlotForPrompt(slot));

  const opening =
    input.tone === "brief"
      ? `Hi ${input.clientFirstName}, this is Closing Day calling for ${input.agentFirstName}. I saw questions around ${concernText} on ${input.propertyAddress}, and I wanted to hear what feels most urgent right now.`
      : `Hi ${input.clientFirstName}, this is Closing Day calling on behalf of ${input.agentFirstName}. I know ${input.propertyAddress} is in the ${input.stageLabel.toLowerCase()} stage, and I saw concerns around ${concernText}. What feels heaviest right now?`;

  const followUp =
    input.tone === "detailed"
      ? `${input.agentFirstName} can help you sort the facts from the stress here. Before that conversation, is the biggest priority protecting the price, understanding the repair risk, or making sure the timeline still feels safe?`
      : `That helps. ${input.agentFirstName} can walk you through the repair, price, and timing choices. Before that call, is the bigger priority the money, the timeline, or just understanding the safest next move?`;

  const booking =
    input.tone === "brief"
      ? `I can hold a short call with ${input.agentFirstName}. One of these times is open: ${slotLabels.join(", ")}. Which one works best, or is there one more question to flag first?`
      : `I'm going to summarize this for ${input.agentFirstName} so you do not have to repeat the whole story. I can hold one of these times for a focused call: ${slotLabels.join(", ")}. Which one feels best, or is there one more question you want covered?`;

  return [opening, followUp, booking].map((line) => trimToLength(line, 280));
}

export async function buildVoiceBotScript(
  input: VoiceBotScripterInput
): Promise<VoiceBotScripterResult> {
  const fallback = buildFallbackPlan(input);

  const result = await runGroqTask({
    taskName: "Voice bot script",
    system:
      "You write short, trustworthy outbound real-estate call scripts. You return valid JSON only.",
    prompt: getVoiceBotScriptPrompt(input),
    sources: [
      `property:${input.propertyAddress}`,
      `client:${input.clientFirstName}`,
      `stage:${input.stageLabel}`,
      `tone:${input.tone}`
    ],
    fallback: () => ({ plan: fallback }),
    parse: (responseText) => {
      const parsed = voiceBotPlanSchema.parse(JSON.parse(stripCodeFences(responseText)) as unknown);
      return {
        plan: parsed.plan.slice(0, 3).map((line) => trimToLength(line, 280))
      };
    }
  });

  if (result.generatedBy === "fallback") {
    logger.warn("Voice bot script used fallback", {
      clientFirstName: input.clientFirstName,
      propertyAddress: input.propertyAddress
    });
  }

  return result;
}
