import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { logger } from "../config/logger";

export function globalErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // express.json() rejects malformed request bodies with a SyntaxError
  // that already carries the correct 4xx status (per Express's own
  // body-parser convention: statusCode + expose: true) -- without this
  // check it fell through to the generic 500 branch below, misreporting
  // a client mistake (bad JSON) as a server failure.
  if (
    err instanceof SyntaxError &&
    "status" in err &&
    typeof err.status === "number" &&
    err.status >= 400 &&
    err.status < 500
  ) {
    return res.status(err.status).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Malformed request body",
        details: [],
      },
    });
  }

  logger.error({ err });

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      details: [],
    },
  });
}
