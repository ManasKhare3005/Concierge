import type { NextFunction, Request, Response } from "express";

import { verifyClientSession } from "../lib/jwt";
import { validateMagicLinkPortalToken } from "../services/magicLink";

function readBearerToken(request: Request): string | null {
  const authorizationHeader = request.header("authorization");
  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.slice("Bearer ".length);
  }

  const tokenFromQuery = request.query["token"];
  return typeof tokenFromQuery === "string" ? tokenFromQuery : null;
}

export async function requireClientAuth(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  const token = readBearerToken(request);

  if (!token) {
    response.status(401).json({ message: "Missing client access token." });
    return;
  }

  try {
    const clientSession = verifyClientSession(token);
    if (clientSession) {
      request.clientSession = clientSession;
      request.clientAccessToken = token;
      next();
      return;
    }

    const magicLinkAccess = await validateMagicLinkPortalToken(token);
    if (!magicLinkAccess) {
      response.status(401).json({ message: "Invalid client session." });
      return;
    }

    request.clientSession = magicLinkAccess.session;
    request.clientAccessToken = token;
    request.magicLinkPortalId = magicLinkAccess.portalId;
    next();
  } catch {
    response.status(401).json({ message: "Invalid client session." });
  }
}
