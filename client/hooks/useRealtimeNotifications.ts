"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import type { Notification } from "@/types/notification";

export function useRealtimeNotifications() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNotification = (notification: Notification) => {
      toast(notification.title, {
        description: notification.message
      });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    const onUploadProgress = () => {
      queryClient.invalidateQueries({ queryKey: ["uploads"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    };

    let reportedDisconnect = false;
    const onConnect = () => {
      if (reportedDisconnect) {
        toast.success("Realtime updates restored");
      }
      reportedDisconnect = false;
    };
    const onRealtimeUnavailable = () => {
      if (reportedDisconnect) return;
      reportedDisconnect = true;
      toast.warning("Realtime updates disconnected");
    };

    socket.on("connect", onConnect);
    socket.on("connect_error", onRealtimeUnavailable);
    socket.on("disconnect", onRealtimeUnavailable);
    socket.on("notification.created", onNotification);
    socket.on("upload.progress", onUploadProgress);

    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onRealtimeUnavailable);
      socket.off("disconnect", onRealtimeUnavailable);
      socket.off("notification.created", onNotification);
      socket.off("upload.progress", onUploadProgress);
    };
  }, [queryClient]);
}
