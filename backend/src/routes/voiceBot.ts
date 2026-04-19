import { Router } from "express";
import { z } from "zod";

import { requireAgentAuth } from "../middleware/agentAuth";
import {
  confirmVoiceBotSession,
  getVoiceBotSession,
  initiateVoiceBotSession,
  respondToVoiceBotSession
} from "../services/voiceBot/orchestrator";

const router = Router();

const initiateSchema = z.object({
  transactionId: z.string().min(1),
  clientAccountId: z.string().min(1),
  concerns: z.array(z.string().trim().min(3).max(120)).min(1).max(3).optional(),
  tone: z.enum(["warm", "brief", "detailed"]).optional(),
  proposedSlots: z.array(z.string().datetime()).length(3).optional()
});

const respondSchema = z.object({
  response: z.string().trim().min(2).max(400)
});

const confirmSchema = z.object({
  bookedSlot: z.string().datetime(),
  clientNewQuestion: z.string().trim().min(3).max(400).optional()
});

router.use(requireAgentAuth);

router.post("/initiate", async (request, response) => {
  const agentId = request.agent?.agentId;
  if (!agentId) {
    response.status(401).json({ message: "Missing agent session." });
    return;
  }

  const parsedBody = initiateSchema.safeParse(request.body);
  if (!parsedBody.success) {
    response.status(400).json({
      message: "Invalid voice bot initiation payload.",
      issues: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const session = await initiateVoiceBotSession({
      agentId,
      transactionId: parsedBody.data.transactionId,
      clientAccountId: parsedBody.data.clientAccountId,
      ...(parsedBody.data.concerns ? { concerns: parsedBody.data.concerns } : {}),
      ...(parsedBody.data.tone ? { tone: parsedBody.data.tone } : {}),
      ...(parsedBody.data.proposedSlots ? { proposedSlots: parsedBody.data.proposedSlots } : {})
    });

    response.status(201).json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to initiate voice bot session.";
    response.status(message.includes("not found") ? 404 : 400).json({ message });
  }
});

router.get("/:sessionId", async (request, response) => {
  const agentId = request.agent?.agentId;
  const sessionId = request.params["sessionId"];

  if (!agentId) {
    response.status(401).json({ message: "Missing agent session." });
    return;
  }

  if (typeof sessionId !== "string") {
    response.status(400).json({ message: "Invalid session id." });
    return;
  }

  try {
    const session = await getVoiceBotSession(agentId, sessionId);
    response.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load voice bot session.";
    response.status(message.includes("not found") ? 404 : 400).json({ message });
  }
});

router.post("/:sessionId/respond", async (request, response) => {
  const agentId = request.agent?.agentId;
  const sessionId = request.params["sessionId"];

  if (!agentId) {
    response.status(401).json({ message: "Missing agent session." });
    return;
  }

  if (typeof sessionId !== "string") {
    response.status(400).json({ message: "Invalid session id." });
    return;
  }

  const parsedBody = respondSchema.safeParse(request.body);
  if (!parsedBody.success) {
    response.status(400).json({
      message: "Invalid voice bot response payload.",
      issues: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const session = await respondToVoiceBotSession({
      agentId,
      sessionId,
      response: parsedBody.data.response
    });
    response.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to advance the voice bot session.";
    response.status(message.includes("not found") ? 404 : 400).json({ message });
  }
});

router.post("/:sessionId/confirm", async (request, response) => {
  const agentId = request.agent?.agentId;
  const sessionId = request.params["sessionId"];

  if (!agentId) {
    response.status(401).json({ message: "Missing agent session." });
    return;
  }

  if (typeof sessionId !== "string") {
    response.status(400).json({ message: "Invalid session id." });
    return;
  }

  const parsedBody = confirmSchema.safeParse(request.body);
  if (!parsedBody.success) {
    response.status(400).json({
      message: "Invalid voice bot confirmation payload.",
      issues: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const session = await confirmVoiceBotSession({
      agentId,
      sessionId,
      bookedSlot: parsedBody.data.bookedSlot,
      ...(parsedBody.data.clientNewQuestion ? { clientNewQuestion: parsedBody.data.clientNewQuestion } : {})
    });
    response.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to confirm the voice bot booking.";
    response.status(message.includes("not found") ? 404 : 400).json({ message });
  }
});

export { router as voiceBotRouter };
