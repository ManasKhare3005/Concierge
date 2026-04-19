import "../../bootstrap/loadEnv";
import type { ClientSessionPayload, MagicLinkPayload } from "../../lib/jwt";
import { signMagicLink, verifyMagicLink } from "../../lib/jwt";
import { prisma } from "../../lib/prisma";

export interface IssueMagicLinkPortalInput {
  transactionId: string;
  clientAccountId: string;
  expiresAt?: Date;
}

export interface IssuedMagicLinkPortal {
  portalId: string;
  token: string;
  expiresAt: string;
  url: string;
}

export interface ValidatedMagicLinkAccess {
  portalId: string;
  payload: MagicLinkPayload;
  session: ClientSessionPayload;
}

function buildMagicLinkUrl(token: string): string {
  const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
  return `${clientOrigin}/client/login?token=${encodeURIComponent(token)}`;
}

export function createMagicLinkToken(payload: MagicLinkPayload): string {
  return signMagicLink(payload);
}

export function parseMagicLinkToken(token: string): MagicLinkPayload | null {
  return verifyMagicLink(token);
}

export async function issueMagicLinkPortal(
  input: IssueMagicLinkPortalInput
): Promise<IssuedMagicLinkPortal> {
  const expiresAt = input.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = createMagicLinkToken({
    type: "magic_link",
    transactionId: input.transactionId,
    clientAccountId: input.clientAccountId,
    expiresAt: expiresAt.toISOString()
  });

  const portal = await prisma.magicLinkPortal.create({
    data: {
      transactionId: input.transactionId,
      clientAccountId: input.clientAccountId,
      token,
      expiresAt
    }
  });

  return {
    portalId: portal.id,
    token,
    expiresAt: expiresAt.toISOString(),
    url: buildMagicLinkUrl(token)
  };
}

export async function validateMagicLinkPortalToken(
  token: string
): Promise<ValidatedMagicLinkAccess | null> {
  const payload = parseMagicLinkToken(token);
  if (!payload) {
    return null;
  }

  const expiresAt = new Date(payload.expiresAt);
  if (Number.isNaN(expiresAt.valueOf()) || expiresAt <= new Date()) {
    await prisma.magicLinkPortal.updateMany({
      where: {
        token,
        status: "active"
      },
      data: {
        status: "expired"
      }
    });
    return null;
  }

  const portal = await prisma.magicLinkPortal.findUnique({
    where: {
      token
    }
  });

  if (!portal) {
    return null;
  }

  if (
    portal.status !== "active" ||
    portal.expiresAt <= new Date() ||
    portal.clientAccountId !== payload.clientAccountId ||
    portal.transactionId !== payload.transactionId
  ) {
    if (portal.status === "active" && portal.expiresAt <= new Date()) {
      await prisma.magicLinkPortal.update({
        where: {
          id: portal.id
        },
        data: {
          status: "expired"
        }
      });
    }

    return null;
  }

  await prisma.magicLinkPortal.update({
    where: {
      id: portal.id
    },
    data: {
      lastOpenedAt: new Date()
    }
  });

  return {
    portalId: portal.id,
    payload,
    session: {
      type: "client",
      clientAccountId: payload.clientAccountId,
      accessibleTransactionIds: [payload.transactionId],
      via: "magic_link"
    }
  };
}
