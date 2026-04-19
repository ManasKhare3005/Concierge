import type { RealtimeEvent } from "@shared";
import type { Request, Response } from "express";
import { Router } from "express";

import { verifyAgentSession, verifyClientSession } from "../lib/jwt";
import { eventBus } from "../lib/eventBus";
import { validateMagicLinkPortalToken } from "../services/magicLink";

const router = Router();

function getAccessToken(request: Request): string | null {
  const authorizationHeader = request.header("authorization");
  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.slice("Bearer ".length);
  }

  const tokenFromQuery = request.query["token"];
  return typeof tokenFromQuery === "string" ? tokenFromQuery : null;
}

function initializeEventStream(response: Response): void {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders();
}

function writeEvent(response: Response, event: RealtimeEvent): void {
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

function writeHeartbeat(response: Response): void {
  response.write(`: heartbeat ${Date.now()}\n\n`);
}

router.get("/agent/events", (request, response) => {
  const token = getAccessToken(request);
  if (!token) {
    response.status(401).json({ message: "Missing agent event token." });
    return;
  }

  const agentSession = verifyAgentSession(token);
  if (!agentSession) {
    response.status(401).json({ message: "Invalid agent session." });
    return;
  }

  initializeEventStream(response);
  response.write(`retry: 2000\n\n`);

  const unsubscribe = eventBus.onAny((event) => {
    const payload = event.payload as { agentId?: string };
    if (payload.agentId !== agentSession.agentId) {
      return;
    }

    writeEvent(response, event);
  });

  const heartbeat = setInterval(() => {
    writeHeartbeat(response);
  }, 30_000);

  request.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    response.end();
  });
});

router.get("/client/events", async (request, response) => {
  const token = getAccessToken(request);
  if (!token) {
    response.status(401).json({ message: "Missing client event token." });
    return;
  }

  const clientSession = verifyClientSession(token);
  const magicLinkAccess = clientSession ? null : await validateMagicLinkPortalToken(token);
  const resolvedSession = clientSession ?? magicLinkAccess?.session;

  if (!resolvedSession) {
    response.status(401).json({ message: "Invalid client session." });
    return;
  }

  initializeEventStream(response);
  response.write(`retry: 2000\n\n`);

  const unsubscribe = eventBus.onAny((event) => {
    const payload = event.payload as { clientAccountId?: string };
    if (payload.clientAccountId !== resolvedSession.clientAccountId) {
      return;
    }

    writeEvent(response, event);
  });

  const heartbeat = setInterval(() => {
    writeHeartbeat(response);
  }, 30_000);

  request.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    response.end();
  });
});

export { router as eventsRouter };
