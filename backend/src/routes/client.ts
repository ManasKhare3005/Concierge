import { Router } from "express";

const router = Router();

router.get("/portfolio", (_request, response) => {
  response.status(501).json({ message: "Phase 2 will implement the client portfolio API." });
});

export { router as clientRouter };
