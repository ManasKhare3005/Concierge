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

export interface OutboundCallResult {
  success: boolean;
  message: string;
  generatedBy: "elevenlabs" | "fallback";
  transparency: AiTransparency;
  conversationId?: string;
  callSid?: string;
}

export interface SynthesizeSpeechOptions {
  text: string;
  sources: string[];
  fallbackText?: string;
}

export interface OutboundCallOptions {
  toNumber: string;
  sources: string[];
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
    detail: process.env.ELEVENLABS_AGENT_ID && process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID
      ? `Configured for voice ${process.env.ELEVENLABS_VOICE_ID ?? "default"} and outbound calling.`
      : `Configured for voice ${process.env.ELEVENLABS_VOICE_ID ?? "default"}. Outbound calling is not configured yet.`
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

export async function initiateOutboundCall(
  options: OutboundCallOptions
): Promise<OutboundCallResult> {
  if (
    !process.env.ELEVENLABS_API_KEY ||
    !process.env.ELEVENLABS_AGENT_ID ||
    !process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID
  ) {
    return {
      success: false,
      message:
        "Outbound calling is not configured. Add ELEVENLABS_AGENT_ID and ELEVENLABS_AGENT_PHONE_NUMBER_ID after connecting a Twilio-backed number in ElevenLabs.",
      generatedBy: "fallback",
      transparency: buildTransparency(
        "fallback",
        options.sources,
        "The ElevenLabs API key or outbound-calling identifiers are missing."
      )
    };
  }

  try {
    const response = await axios.post<{
      success: boolean;
      message: string;
      conversation_id?: string | null;
      callSid?: string | null;
    }>(
      "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
      {
        agent_id: process.env.ELEVENLABS_AGENT_ID,
        agent_phone_number_id: process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID,
        to_number: options.toNumber
      },
      {
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    return {
      success: response.data.success,
      message: response.data.message,
      generatedBy: "elevenlabs",
      transparency: buildTransparency(
        "elevenlabs",
        options.sources,
        "A live outbound call was initiated through the ElevenLabs Twilio integration."
      ),
      ...(response.data.conversation_id ? { conversationId: response.data.conversation_id } : {}),
      ...(response.data.callSid ? { callSid: response.data.callSid } : {})
    };
  } catch (error) {
    logger.error("ElevenLabs outbound call failed", {
      error: error instanceof Error ? error.message : error
    });

    return {
      success: false,
      message:
        "Closing Day could not start the live outbound call. Check the ElevenLabs agent, phone number import, and outbound-call permissions.",
      generatedBy: "fallback",
      transparency: buildTransparency(
        "fallback",
        options.sources,
        "The ElevenLabs outbound-call request failed and no live phone call was started."
      )
    };
  }
}
