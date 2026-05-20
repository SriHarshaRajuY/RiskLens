import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { authService } from "../modules/auth/auth.service.js";
import { metricsService } from "../modules/metrics/metrics.service.js";
import { ACCESS_TOKEN_COOKIE, parseCookieHeader } from "../utils/cookies.js";

let io: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true
    }
  });

  io.use((socket, next) => {
    try {
      const cookies = parseCookieHeader(socket.handshake.headers.cookie);
      const token =
        socket.handshake.auth?.token ??
        socket.handshake.headers.authorization?.replace("Bearer ", "") ??
        cookies[ACCESS_TOKEN_COOKIE];
      if (!token || typeof token !== "string") {
        next(new Error("Authentication required"));
        return;
      }
      const payload = authService.verifyToken(token);
      socket.data.userId = payload.sub;
      socket.data.email = payload.email;
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error("Socket auth failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = String(socket.data.userId);
    socket.join(userRoom(userId));
    metricsService.increment("websocketConnections");
    logger.info({ userId, socketId: socket.id }, "WebSocket connected");

    socket.on("disconnect", () => {
      metricsService.increment("websocketConnections", -1);
      logger.info({ userId, socketId: socket.id }, "WebSocket disconnected");
    });
  });

  return io;
}

export function getSocketServer(): Server | null {
  return io;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  const server = getSocketServer();
  if (!server) return;
  server.to(userRoom(userId)).emit(event, payload);
  logger.info({ userId, event }, "WebSocket event emitted");
}
