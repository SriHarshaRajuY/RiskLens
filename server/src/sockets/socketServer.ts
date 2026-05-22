import type { Server as HttpServer } from "node:http";
import { randomUUID } from "node:crypto";
import type { Redis } from "ioredis";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { createRedisConnection, getRedis } from "../config/redis.js";
import { authService } from "../modules/auth/auth.service.js";
import { metricsService } from "../modules/metrics/metrics.service.js";
import { ACCESS_TOKEN_COOKIE, parseCookieHeader } from "../utils/cookies.js";

const REALTIME_CHANNEL = "risklens:realtime";
const INSTANCE_ID = randomUUID();
const localSocketOrigins = env.NODE_ENV === "production" ? [] : ["http://localhost:3000", "http://127.0.0.1:3000"];
const allowedSocketOrigins = Array.from(
  new Set([env.CLIENT_URL, ...localSocketOrigins, ...(env.CLIENT_URLS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [])])
);

let io: Server | null = null;
let realtimeSubscriber: Redis | null = null;

type RealtimeEnvelope = {
  sourceId: string;
  userId: string;
  event: string;
  payload: unknown;
};

function emitLocal(userId: string, event: string, payload: unknown): void {
  const server = getSocketServer();
  if (!server) return;
  server.to(userRoom(userId)).emit(event, payload);
}

async function publishRealtimeEvent(userId: string, event: string, payload: unknown): Promise<void> {
  const envelope: RealtimeEnvelope = {
    sourceId: INSTANCE_ID,
    userId,
    event,
    payload
  };
  await getRedis().publish(REALTIME_CHANNEL, JSON.stringify(envelope));
}

function ensureRealtimeSubscriber(): void {
  if (realtimeSubscriber) return;
  realtimeSubscriber = createRedisConnection("risklens-realtime-subscriber");
  realtimeSubscriber.subscribe(REALTIME_CHANNEL).catch((error) => {
    logger.error({ component: "socket", error }, "Failed to subscribe to realtime channel");
  });
  realtimeSubscriber.on("message", (_channel, message) => {
    try {
      const envelope = JSON.parse(message) as RealtimeEnvelope;
      if (envelope.sourceId === INSTANCE_ID) return;
      emitLocal(envelope.userId, envelope.event, envelope.payload);
    } catch (error) {
      logger.warn({ component: "socket", error }, "Dropped malformed realtime event");
    }
  });
}

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedSocketOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Origin is not allowed by Socket.IO CORS"));
      },
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

  ensureRealtimeSubscriber();
  return io;
}

export function getSocketServer(): Server | null {
  return io;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  emitLocal(userId, event, payload);
  publishRealtimeEvent(userId, event, payload).catch((error) => {
    logger.warn({ userId, event, error }, "Failed to publish realtime event");
  });
  logger.info({ userId, event }, "WebSocket event emitted");
}
