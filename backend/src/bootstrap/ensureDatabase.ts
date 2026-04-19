import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "../lib/prisma";

export async function ensureDatabase(): Promise<void> {
  await fs.mkdir(path.resolve(process.cwd(), "uploads"), { recursive: true });
  await fs.mkdir(path.resolve(process.cwd(), "seed-assets"), { recursive: true });
  await prisma.$connect();
}
