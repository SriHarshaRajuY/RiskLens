"use client";

import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/lib/constants";
import { getStoredToken } from "@/lib/api";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const token = getStoredToken();
  if (!token) return null;

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"]
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
