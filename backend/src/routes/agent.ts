import { Router } from "express";

const router = Router();

router.get("/triage", (_request, response) => {
  response.status(501).json({ message: "Phase 5 will implement the triage API." });
});

export { router as agentRouter };
