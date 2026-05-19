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

    socket.on("notification.created", onNotification);
    socket.on("upload.progress", onUploadProgress);

    return () => {
      socket.off("notification.created", onNotification);
      socket.off("upload.progress", onUploadProgress);
    };
  }, [queryClient]);
}
