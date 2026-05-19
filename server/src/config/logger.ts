import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : "info",
  base: {
    service: "risklens-api",
    env: env.NODE_ENV
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "password",
      "passwordHash",
      "token",
      "*.password",
      "*.passwordHash",
      "*.token"
    ],
    remove: true
  }
});
