"use client";

import { io, type Socket } from "socket.io-client";
import { apiRequest, setCsrfToken } from "@/lib/api";
import { SOCKET_URL } from "@/lib/constants";
import type { AuthPayload } from "@/types/auth";

let socket: Socket | null = null;
let socketRefreshPromise: Promise<void> | null = null;
let intentionalDisconnect = false;

function shouldRefreshForSocketError(error: Error): boolean {
  return /auth|jwt|token|unauthorized|expired/i.test(error.message);
}

function refreshSocketSession(): Promise<void> {
  socketRefreshPromise ??= apiRequest<AuthPayload>("/auth/refresh", {
    method: "POST",
    skipAuthRefresh: true,
    timeoutMs: 10_000
  })
    .then((payload) => {
      setCsrfToken(payload.csrfToken);
    })
    .finally(() => {
      socketRefreshPromise = null;
    });

  return socketRefreshPromise;
}

export function isIntentionalSocketDisconnect(): boolean {
  return intentionalDisconnect;
}

export function getSocket(): Socket | null {
  intentionalDisconnect = false;

  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"]
    });

    socket.on("connect_error", (error) => {
      if (!socket || intentionalDisconnect || !shouldRefreshForSocketError(error)) return;
      refreshSocketSession()
        .then(() => {
          if (!intentionalDisconnect) {
            socket?.connect();
          }
        })
        .catch(() => undefined);
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  intentionalDisconnect = true;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
