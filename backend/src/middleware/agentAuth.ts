import type { NextFunction, Request, Response } from "express";

import { verifyAgentSession } from "../lib/jwt";

function readBearerToken(request: Request): string | null {
  const authorizationHeader = request.header("authorization");
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length);
}

export function requireAgentAuth(request: Request, response: Response, next: NextFunction): void {
  const token = readBearerToken(request);

  if (!token) {
    response.status(401).json({ message: "Missing agent bearer token." });
    return;
  }

  try {
    const agent = verifyAgentSession(token);
    if (!agent) {
      response.status(401).json({ message: "Invalid agent session." });
      return;
    }

    request.agent = agent;
    next();
  } catch {
    response.status(401).json({ message: "Invalid agent session." });
  }
}
