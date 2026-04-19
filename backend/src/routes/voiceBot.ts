import { Router } from "express";

const router = Router();

router.post("/initiate", (_request, response) => {
  response.status(501).json({ message: "Phase 6 will implement the voice bot." });
});

export { router as voiceBotRouter };
