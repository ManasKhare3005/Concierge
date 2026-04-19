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

function normalizeOutboundPhoneNumber(rawValue: string): string | undefined {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^\+[1-9]\d{9,14}$/.test(trimmed)) {
    return trimmed;
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    return `+${digitsOnly}`;
  }

  return undefined;
}

function extractErrorDetail(error: unknown): { status?: string; message?: string } {
  if (!axios.isAxiosError(error)) {
    return {};
  }

  const responseData = error.response?.data;
  if (!responseData || typeof responseData !== "object" || !("detail" in responseData)) {
    return {};
  }

  const detail = responseData["detail"];
  if (!detail || typeof detail !== "object") {
    return {};
  }

  const status = "status" in detail ? String(detail["status"]) : undefined;
  const message = "message" in detail ? String(detail["message"]) : undefined;

  return {
    ...(status ? { status } : {}),
    ...(message ? { message } : {})
  };
}

function formatOutboundCallError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "Closing Day could not start the live outbound call because the request failed before ElevenLabs returned a usable response.";
  }

  const status = error.response?.status;
  const responseData = error.response?.data;
  const detail = extractErrorDetail(error);
  const responseMessage =
    typeof responseData === "string"
      ? responseData
      : detail.message;

  if (status === 401) {
    if (detail.status === "missing_permissions" && detail.message) {
      return `ElevenLabs rejected the outbound call because this API key is missing the required permission: ${detail.message} Update the key in ElevenLabs Developers > API Keys and enable the needed Conversational AI permissions, or create an unrestricted key for local testing.`;
    }

    return "ElevenLabs rejected the outbound call request with 401 Unauthorized. Verify that ELEVENLABS_API_KEY belongs to the same workspace as ELEVENLABS_AGENT_ID and ELEVENLABS_AGENT_PHONE_NUMBER_ID, and that the imported Twilio-backed number is enabled for outbound calls.";
  }

  if (status === 422) {
    return `ElevenLabs accepted your credentials but rejected the outbound call payload. ${responseMessage ?? "Check the destination phone number format and the selected agent phone number configuration."}`;
  }

  if (status) {
    return `ElevenLabs returned ${status} while starting the outbound call.${responseMessage ? ` ${responseMessage}` : ""}`;
  }

  return error.message;
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
      ? `Configured from env for voice ${process.env.ELEVENLABS_VOICE_ID ?? "default"} and outbound calling. API-key permissions are not verified at startup.`
      : `Configured from env for voice ${process.env.ELEVENLABS_VOICE_ID ?? "default"}. Outbound calling is not configured yet, and API-key permissions are not verified at startup.`
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

  const normalizedNumber = normalizeOutboundPhoneNumber(options.toNumber);
  if (!normalizedNumber) {
    return {
      success: false,
      message:
        "Closing Day could not start the live outbound call because the phone number is not in a valid outbound format. Use a full international number or a 10-digit U.S. number.",
      generatedBy: "fallback",
      transparency: buildTransparency(
        "fallback",
        options.sources,
        "The phone number could not be normalized into the outbound format ElevenLabs expects."
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
        to_number: normalizedNumber
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
      error: error instanceof Error ? error.message : error,
      status: axios.isAxiosError(error) ? error.response?.status : undefined,
      responseData: axios.isAxiosError(error) ? error.response?.data : undefined
    });

    return {
      success: false,
      message: formatOutboundCallError(error),
      generatedBy: "fallback",
      transparency: buildTransparency(
        "fallback",
        options.sources,
        "The ElevenLabs outbound-call request failed and no live phone call was started."
      )
    };
  }
}
