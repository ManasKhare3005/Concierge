import { Router } from "express";

const router = Router();

router.post("/upload", (_request, response) => {
  response.status(501).json({ message: "Phase 3 will implement document uploads." });
});

export { router as documentsRouter };
