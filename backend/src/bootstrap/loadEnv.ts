import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

let loadedPath: string | undefined;
let isLoaded = false;

export interface LoadedEnv {
  loadedPath: string | undefined;
}

export function loadEnv(): LoadedEnv {
  if (isLoaded) {
    return { loadedPath };
  }

  const candidatePaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env")
  ];

  for (const candidatePath of candidatePaths) {
    if (fs.existsSync(candidatePath)) {
      dotenv.config({ path: candidatePath });
      loadedPath = candidatePath;
      break;
    }
  }

  isLoaded = true;
  return { loadedPath };
}

loadEnv();
