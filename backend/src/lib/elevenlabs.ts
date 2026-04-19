import axios from "axios";
import type { AiTransparency, ServiceStatus } from "@shared";

import "../bootstrap/loadEnv";
import { logger } from "./logger";

export interface SpeechSynthesisResult {
  audioBase64?: string;
  mimeType: "audio/mpeg";
  generatedBy: "elevenlabs" | "fallback";
  transparency: AiTransparency;
}

export interface SynthesizeSpeechOptions {
  text: string;
  sources: string[];
  fallbackText?: string;
}

export function getElevenLabsStatus(): ServiceStatus {
  if (!process.env.ELEVENLABS_API_KEY) {
    return {
      name: "elevenlabs",
      state: "fallback",
      detail: "ELEVENLABS_API_KEY is not set. Voice playback will use transcript-only fallback."
    };
  }

  return {
    name: "elevenlabs",
    state: "configured",
    detail: `Configured for voice ${process.env.ELEVENLABS_VOICE_ID ?? "default"}.`
  };
}

function buildTransparency(generatedBy: "elevenlabs" | "fallback", sources: string[], note: string): AiTransparency {
  return {
    sources,
    note: `${generatedBy === "elevenlabs" ? "ElevenLabs response" : "Fallback response"}: ${note}`
  };
}

export async function synthesizeSpeech(
  options: SynthesizeSpeechOptions
): Promise<SpeechSynthesisResult> {
  if (!process.env.ELEVENLABS_API_KEY) {
    return {
      mimeType: "audio/mpeg",
      generatedBy: "fallback",
      transparency: buildTransparency(
        "fallback",
        options.sources,
        "Voice synthesis is not configured, so only transcript fallback is available."
      )
    };
  }

  try {
    const response = await axios.post<ArrayBuffer>(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID ?? "JBFqnCBsd6RMkjVDRZzb"}`,
      {
        text: options.text,
        model_id: process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2"
      },
      {
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          Accept: "audio/mpeg",
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer",
        timeout: 15000
      }
    );

    return {
      audioBase64: Buffer.from(response.data).toString("base64"),
      mimeType: "audio/mpeg",
      generatedBy: "elevenlabs",
      transparency: buildTransparency(
        "elevenlabs",
        options.sources,
        "Audio was synthesized with ElevenLabs."
      )
    };
  } catch (error) {
    logger.error("ElevenLabs synthesis failed", {
      error: error instanceof Error ? error.message : error
    });

    return {
      mimeType: "audio/mpeg",
      generatedBy: "fallback",
      transparency: buildTransparency(
        "fallback",
        options.sources,
        options.fallbackText ?? "Voice synthesis failed, so transcript fallback will be shown instead."
      )
    };
  }
}
