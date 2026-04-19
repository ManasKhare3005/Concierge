import cors from "cors";
import express from "express";

import "./bootstrap/loadEnv";
import { ensureDatabase } from "./bootstrap/ensureDatabase";
import { verifyEnv } from "./bootstrap/verifyEnv";
import { logger } from "./lib/logger";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { agentRouter } from "./routes/agent";
import { authRouter } from "./routes/auth";
import { clientRouter } from "./routes/client";
import { diagnosticsRouter } from "./routes/diagnostics";
import { documentsRouter } from "./routes/documents";
import { eventsRouter } from "./routes/events";
import { voiceBotRouter } from "./routes/voiceBot";

async function startServer(): Promise<void> {
  const diagnostics = verifyEnv();
  await ensureDatabase();

  const app = express();

  app.use(
    cors({
      origin: diagnostics.clientOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(requestLogger);

  app.get("/api", (_request, response) => {
    response.json({
      app: "Closing Day API",
      status: "ok",
      phase: 1
    });
  });

  app.use("/api/diagnostics", diagnosticsRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/agent", agentRouter);
  app.use("/api/client", clientRouter);
  app.use("/api/documents", documentsRouter);
  app.use("/api/events", eventsRouter);
  app.use("/api/voice-bot", voiceBotRouter);
  app.use(errorHandler);

  const port = diagnostics.port;
  app.listen(port, () => {
    logger.info("Closing Day backend listening", {
      port,
      clientOrigin: diagnostics.clientOrigin
    });
  });
}

void startServer().catch((error: unknown) => {
  logger.error("Failed to boot backend", {
    error: error instanceof Error ? error.message : error
  });
  process.exit(1);
});
