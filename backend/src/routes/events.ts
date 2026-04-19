import { Router } from "express";

const router = Router();

router.get("/agent", (_request, response) => {
  response.status(501).json({ message: "Phase 5 will implement agent SSE." });
});

router.get("/client", (_request, response) => {
  response.status(501).json({ message: "Phase 5 will implement client SSE." });
});

export { router as eventsRouter };
