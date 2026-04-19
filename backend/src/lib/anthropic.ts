import Anthropic from "@anthropic-ai/sdk";
import type { AiTransparency, GeneratedBy, ServiceStatus } from "@shared";

import "../bootstrap/loadEnv";
import { logger } from "./logger";

const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export interface AnthropicTaskOptions<TOutput extends object> {
  taskName: string;
  system: string;
  prompt: string;
  sources: string[];
  fallback: () => Promise<TOutput> | TOutput;
  parse: (responseText: string) => Promise<TOutput> | TOutput;
  maxTokens?: number;
  temperature?: number;
}

export type AnthropicTaskResult<TOutput extends object> = TOutput & {
  generatedBy: GeneratedBy;
  transparency: AiTransparency;
};

function buildTransparency(
  generatedBy: GeneratedBy,
  sources: string[],
  note: string
): AiTransparency {
  return {
    sources,
    note: `${generatedBy === "anthropic" ? "Anthropic response" : "Fallback response"}: ${note}`
  };
}

function getResponseText(response: Awaited<ReturnType<Anthropic["messages"]["create"]>>): string {
  if (!("content" in response)) {
    throw new Error("Expected a non-streaming Anthropic response.");
  }

  return response.content
    .map((block) => {
      if (block.type === "text") {
        return block.text;
      }

      return "";
    })
    .join("\n")
    .trim();
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return { error };
}

export function getAnthropicStatus(): ServiceStatus {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      name: "anthropic",
      state: "fallback",
      detail: "ANTHROPIC_API_KEY is not set. Heuristic fallbacks will be used."
    };
  }

  return {
    name: "anthropic",
    state: "configured",
    detail: `Configured for model ${process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5"}.`
  };
}

export async function runAnthropicTask<TOutput extends object>(
  options: AnthropicTaskOptions<TOutput>
): Promise<AnthropicTaskResult<TOutput>> {
  const fallbackResult = await options.fallback();

  if (!anthropicClient) {
    return {
      ...fallbackResult,
      generatedBy: "fallback",
      transparency: buildTransparency(
        "fallback",
        options.sources,
        "Anthropic is not configured, so heuristic logic handled this request."
      )
    };
  }

  try {
    const response = await anthropicClient.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
      max_tokens: options.maxTokens ?? 1200,
      temperature: options.temperature ?? 0.2,
      system: options.system,
      messages: [{ role: "user", content: options.prompt }]
    });

    const responseText = getResponseText(response);
    const parsed = await options.parse(responseText);

    return {
      ...parsed,
      generatedBy: "anthropic",
      transparency: buildTransparency(
        "anthropic",
        options.sources,
        `${options.taskName} used live transaction context and model output.`
      )
    };
  } catch (error) {
    logger.error("Anthropic request failed", {
      taskName: options.taskName,
      ...serializeError(error)
    });

    return {
      ...fallbackResult,
      generatedBy: "fallback",
      transparency: buildTransparency(
        "fallback",
        options.sources,
        `${options.taskName} fell back after an Anthropic error.`
      )
    };
  }
}
