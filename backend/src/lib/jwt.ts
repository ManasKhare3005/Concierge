import jwt from "jsonwebtoken";

import "../bootstrap/loadEnv";

const sessionSecret = process.env.SESSION_SECRET ?? "concierge-session-secret";
const magicLinkSecret = process.env.MAGIC_LINK_SECRET ?? "concierge-magic-secret";

export interface AgentSessionPayload {
  type: "agent";
  agentId: string;
  email: string;
}

export interface ClientSessionPayload {
  type: "client";
  clientAccountId: string;
  accessibleTransactionIds: string[];
  via: "password" | "magic_link";
}

export interface MagicLinkPayload {
  type: "magic_link";
  transactionId: string;
  clientAccountId: string;
  expiresAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAgentSessionPayload(value: unknown): value is AgentSessionPayload {
  return isRecord(value) && value["type"] === "agent";
}

function isClientSessionPayload(value: unknown): value is ClientSessionPayload {
  return isRecord(value) && value["type"] === "client";
}

function isMagicLinkPayload(value: unknown): value is MagicLinkPayload {
  return isRecord(value) && value["type"] === "magic_link";
}

export function signAgentSession(payload: AgentSessionPayload): string {
  return jwt.sign(payload, sessionSecret, { expiresIn: "7d" });
}

export function signClientSession(payload: ClientSessionPayload): string {
  return jwt.sign(payload, sessionSecret, { expiresIn: "7d" });
}

export function signMagicLink(payload: MagicLinkPayload): string {
  return jwt.sign(payload, magicLinkSecret, { expiresIn: "7d" });
}

export function verifyAgentSession(token: string): AgentSessionPayload | null {
  try {
    const decoded = jwt.verify(token, sessionSecret);
    if (isAgentSessionPayload(decoded)) {
      return decoded;
    }
  } catch {
    return null;
  }

  return null;
}

export function verifyClientSession(token: string): ClientSessionPayload | null {
  try {
    const decoded = jwt.verify(token, sessionSecret);
    if (isClientSessionPayload(decoded)) {
      return decoded;
    }
  } catch {
    return null;
  }

  return null;
}

export function verifyMagicLink(token: string): MagicLinkPayload | null {
  try {
    const decoded = jwt.verify(token, magicLinkSecret);
    if (isMagicLinkPayload(decoded)) {
      return decoded;
    }
  } catch {
    return null;
  }

  return null;
}

