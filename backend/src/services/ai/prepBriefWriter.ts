import type { AiTransparency, GeneratedBy } from "@shared";
import { z } from "zod";

import { runGroqTask } from "../../lib/groq";
import { logger } from "../../lib/logger";
import { getPrepBriefPrompt } from "../../prompts/prepBrief";

export interface PrepBriefWriterInput {
  agentName: string;
  clientName: string;
  propertyAddress: string;
  stageLabel: string;
  topConcerns: string[];
  conversationTranscript: string[];
  recentQuestions: string[];
  documentContext: string[];
}

export interface PrepBriefWriterResult {
  text: string;
  generatedBy: GeneratedBy;
  transparency: AiTransparency;
}

const prepBriefSchema = z.object({
  brief: z.string().min(80)
});

function trimToLength(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trim()}...`;
}

function stripCodeFences(responseText: string): string {
  return responseText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function buildFallbackPrepBrief(input: PrepBriefWriterInput): string {
  const concernLine =
    input.topConcerns.length > 0 ? input.topConcerns.join(", ") : "general decision confidence";
  const latestQuestion = input.recentQuestions[0] ?? "No recent question captured.";
  const latestTranscript = input.conversationTranscript.slice(-3).join(" ");
  const documentLine =
    input.documentContext.length > 0 ? input.documentContext.slice(0, 2).join(" ") : "No document summary was available.";

  return trimToLength(
    `${input.clientName} is in the ${input.stageLabel.toLowerCase()} stage for ${input.propertyAddress}. The biggest concerns surfaced by Concierge are ${concernLine}. Their latest transaction question was: ${latestQuestion}. In the simulated call, the client emphasized: ${latestTranscript}. Start the live conversation by acknowledging the stress, narrowing the decision to the one or two issues that actually change risk, and framing a clear next step. Document context to keep in view: ${documentLine}`,
    900
  );
}

export async function writePrepBrief(
  input: PrepBriefWriterInput
): Promise<PrepBriefWriterResult> {
  const fallback = buildFallbackPrepBrief(input);

  const result = await runGroqTask({
    taskName: "Prep brief",
    system:
      "You write concise, high-signal prep briefs for a real-estate agent. You return valid JSON only.",
    prompt: getPrepBriefPrompt(input),
    sources: [
      `property:${input.propertyAddress}`,
      `client:${input.clientName}`,
      `stage:${input.stageLabel}`,
      `transcript:${input.conversationTranscript.length}`
    ],
    fallback: () => ({ brief: fallback }),
    parse: (responseText) => {
      const parsed = prepBriefSchema.parse(JSON.parse(stripCodeFences(responseText)) as unknown);
      return {
        brief: trimToLength(parsed.brief, 900)
      };
    }
  });

  if (result.generatedBy === "fallback") {
    logger.warn("Prep brief used fallback", {
      clientName: input.clientName,
      propertyAddress: input.propertyAddress
    });
  }

  return {
    text: result.brief,
    generatedBy: result.generatedBy,
    transparency: result.transparency
  };
}

