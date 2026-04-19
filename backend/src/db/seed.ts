import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { ensureSeedPdfs } from "./seedPdfs";

async function seed(): Promise<void> {
  await ensureSeedPdfs();
  await prisma.$connect();
  logger.info("Phase 1 scaffold: database seed is intentionally empty until Phase 2.");
}

seed()
  .catch((error: unknown) => {
    logger.error("Seed failed", {
      error: error instanceof Error ? error.message : error
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
