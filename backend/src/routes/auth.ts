import { Router } from "express";

const router = Router();

router.post("/agent/login", (_request, response) => {
  response.status(501).json({ message: "Phase 2 will implement agent login." });
});

router.get("/agent/me", (_request, response) => {
  response.status(501).json({ message: "Phase 2 will implement agent profile lookup." });
});

router.post("/client/login", (_request, response) => {
  response.status(501).json({ message: "Phase 2 will implement client login." });
});

router.post("/client/set-password", (_request, response) => {
  response.status(501).json({ message: "Phase 2 will implement client password upgrades." });
});

router.get("/client/me", (_request, response) => {
  response.status(501).json({ message: "Phase 2 will implement client profile lookup." });
});

export { router as authRouter };
