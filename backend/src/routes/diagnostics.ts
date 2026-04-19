import { Router } from "express";

import { getStartupDiagnostics } from "../bootstrap/verifyEnv";

const router = Router();

router.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    app: "Closing Day API",
    phase: 1,
    timestamp: new Date().toISOString(),
    diagnostics: getStartupDiagnostics()
  });
});

router.get("/services", (_request, response) => {
  response.json({
    services: getStartupDiagnostics().services
  });
});

export { router as diagnosticsRouter };
