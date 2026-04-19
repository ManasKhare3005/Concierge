import type { MagicLinkPayload } from "../../lib/jwt";
import { signMagicLink, verifyMagicLink } from "../../lib/jwt";

export function createMagicLinkToken(payload: MagicLinkPayload): string {
  return signMagicLink(payload);
}

export function parseMagicLinkToken(token: string): MagicLinkPayload | null {
  return verifyMagicLink(token);
}
