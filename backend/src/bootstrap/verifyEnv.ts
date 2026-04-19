import type { ServiceStatus } from "@shared";

import { loadEnv } from "./loadEnv";
import { getAnthropicStatus } from "../lib/anthropic";
import { getElevenLabsStatus } from "../lib/elevenlabs";
import { logger } from "../lib/logger";
import { getLoftyStatus } from "../lib/loftyClient";

export interface StartupDiagnostics {
  envFile: string | undefined;
  port: number;
  clientOrigin: string;
  databaseUrl: string;
  services: ServiceStatus[];
}

export function getStartupDiagnostics(): StartupDiagnostics {
  const { loadedPath } = loadEnv();

  return {
    envFile: loadedPath,
    port: Number(process.env.PORT ?? 4000),
    clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    databaseUrl: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
    services: [getAnthropicStatus(), getElevenLabsStatus(), getLoftyStatus()]
  };
}

export function verifyEnv(): StartupDiagnostics {
  const diagnostics = getStartupDiagnostics();

  logger.info("Environment diagnostics", {
    port: diagnostics.port,
    clientOrigin: diagnostics.clientOrigin,
    databaseUrl: diagnostics.databaseUrl
  });

  for (const service of diagnostics.services) {
    logger.info(`${service.name.charAt(0).toUpperCase()}${service.name.slice(1)}: ${service.state}`, {
      detail: service.detail
    });
  }

  return diagnostics;
}
