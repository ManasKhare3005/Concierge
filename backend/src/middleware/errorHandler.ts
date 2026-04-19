import type { ErrorRequestHandler } from "express";

import { logger } from "../lib/logger";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  logger.error("Unhandled request error", {
    message: error instanceof Error ? error.message : "Unknown error"
  });

  response.status(500).json({
    message: "Closing Day hit an unexpected error.",
    detail: error instanceof Error ? error.message : "Unknown error"
  });
};
