import type { Response } from "express";

type Meta = Record<string, unknown>;

export function ok<T>(res: Response, data: T, meta?: Meta): Response {
  return res.status(200).json({
    success: true,
    data,
    ...(meta ? { meta } : {})
  });
}

export function created<T>(res: Response, data: T, meta?: Meta): Response {
  return res.status(201).json({
    success: true,
    data,
    ...(meta ? { meta } : {})
  });
}

export function accepted<T>(res: Response, data: T, meta?: Meta): Response {
  return res.status(202).json({
    success: true,
    data,
    ...(meta ? { meta } : {})
  });
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}
