import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { ZodError } from "zod";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/errors.js";

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    code: "ROUTE_NOT_FOUND",
    message: `Route ${req.method} ${req.originalUrl} not found`,
    requestId: req.requestId
  });
}

function firstValidationMessage(error: ZodError): string {
  const flattened = error.flatten();
  const fieldError = Object.values(flattened.fieldErrors).find((messages) => messages?.[0])?.[0];
  return fieldError ?? flattened.formErrors[0] ?? "The request contains invalid data";
}

export function errorMiddleware(error: Error, req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === "LIMIT_FILE_SIZE";
    res.status(400).json({
      success: false,
      code: tooLarge ? "CSV_FILE_TOO_LARGE" : "UPLOAD_REJECTED",
      message: tooLarge ? "CSV file must be 5 MB or smaller" : "CSV upload could not be accepted",
      requestId: req.requestId
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: firstValidationMessage(error),
      details: error.flatten(),
      requestId: req.requestId
    });
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      code: "INVALID_OBJECT_ID",
      message: "Invalid resource identifier",
      requestId: req.requestId
    });
    return;
  }

  if ((error as { code?: number }).code === 11000) {
    const duplicate = error as { keyPattern?: Record<string, unknown> };
    const isDuplicateEmail = Boolean(duplicate.keyPattern?.email);
    res.status(409).json({
      success: false,
      code: isDuplicateEmail ? "EMAIL_ALREADY_REGISTERED" : "DUPLICATE_RESOURCE",
      message: isDuplicateEmail ? "Email is already registered" : "A resource with the same unique value already exists",
      requestId: req.requestId
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
      requestId: req.requestId
    });
    return;
  }

  logger.error(
    {
      requestId: req.requestId,
      userId: req.user?.id,
      route: req.originalUrl,
      error
    },
    "Unhandled API error"
  );

  res.status(500).json({
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: "Unexpected server error",
    requestId: req.requestId
  });
}
