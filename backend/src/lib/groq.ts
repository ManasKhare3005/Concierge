import Groq from "groq-sdk";
import type { AiTransparency, GeneratedBy, ServiceStatus } from "@shared";

import "../bootstrap/loadEnv";
import { logger } from "./logger";

const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

export interface GroqTaskOptions<TOutput extends object> {
  taskName: string;
  system: string;
  prompt: string;
  sources: string[];
  fallback: () => Promise<TOutput> | TOutput;
  parse: (responseText: string) => Promise<TOutput> | TOutput;
  maxTokens?: number;
  temperature?: number;
}

export type GroqTaskResult<TOutput extends object> = TOutput & {
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
    note: `${generatedBy === "groq" ? "Groq response" : "Fallback response"}: ${note}`
  };
}

function getResponseText(
  response: Awaited<ReturnType<Groq["chat"]["completions"]["create"]>>
): string {
  if (!("choices" in response)) {
    throw new Error("Expected a non-streaming Groq response.");
  }

  return response.choices
    .map((choice) => choice.message.content ?? "")
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

export function getGroqStatus(): ServiceStatus {
  if (!process.env.GROQ_API_KEY) {
    return {
      name: "groq",
      state: "fallback",
      detail: "GROQ_API_KEY is not set. Heuristic fallbacks will be used."
    };
  }

  return {
    name: "groq",
    state: "configured",
    detail: `Configured for model ${process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile"}.`
  };
}

export async function runGroqTask<TOutput extends object>(
  options: GroqTaskOptions<TOutput>
): Promise<GroqTaskResult<TOutput>> {
  const fallbackResult = await options.fallback();

  if (!groqClient) {
    return {
      ...fallbackResult,
      generatedBy: "fallback",
      transparency: buildTransparency(
        "fallback",
        options.sources,
        "Groq is not configured, so heuristic logic handled this request."
      )
    };
  }

  try {
    const response = await groqClient.chat.completions.create({
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      max_completion_tokens: options.maxTokens ?? 1200,
      temperature: options.temperature ?? 0.2,
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.prompt }
      ]
    });

    const responseText = getResponseText(response);
    const parsed = await options.parse(responseText);

    return {
      ...parsed,
      generatedBy: "groq",
      transparency: buildTransparency(
        "groq",
        options.sources,
        `${options.taskName} used live transaction context and model output.`
      )
    };
  } catch (error) {
    logger.error("Groq request failed", {
      taskName: options.taskName,
      ...serializeError(error)
    });

    return {
      ...fallbackResult,
      generatedBy: "fallback",
      transparency: buildTransparency(
        "fallback",
        options.sources,
        `${options.taskName} fell back after a Groq error.`
      )
    };
  }
}
