"use client";

import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/lib/constants";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"]
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
