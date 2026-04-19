import type { NextFunction, Request, Response } from "express";

import { verifyClientSession, verifyMagicLink } from "../lib/jwt";

function readBearerToken(request: Request): string | null {
  const authorizationHeader = request.header("authorization");
  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.slice("Bearer ".length);
  }

  const tokenFromQuery = request.query["token"];
  return typeof tokenFromQuery === "string" ? tokenFromQuery : null;
}

export function requireClientAuth(request: Request, response: Response, next: NextFunction): void {
  const token = readBearerToken(request);

  if (!token) {
    response.status(401).json({ message: "Missing client access token." });
    return;
  }

  try {
    const clientSession = verifyClientSession(token);
    if (clientSession) {
      request.clientSession = clientSession;
      next();
      return;
    }

    const magicLink = verifyMagicLink(token);
    if (!magicLink) {
      response.status(401).json({ message: "Invalid client session." });
      return;
    }

    request.clientSession = {
      type: "client",
      clientAccountId: magicLink.clientAccountId,
      accessibleTransactionIds: [magicLink.transactionId],
      via: "magic_link"
    };
    next();
  } catch {
    response.status(401).json({ message: "Invalid client session." });
  }
}
