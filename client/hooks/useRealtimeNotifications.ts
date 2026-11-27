"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSocket, isIntentionalSocketDisconnect } from "@/lib/socket";
import type { Notification } from "@/types/notification";

const LIVE_STATUS_TOAST_ID = "live-connection-status";

export function useRealtimeNotifications() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    let disconnectNoticeTimer: number | null = null;
    let reportedDisconnect = false;

    const clearPendingNotice = () => {
      if (disconnectNoticeTimer !== null) {
        window.clearTimeout(disconnectNoticeTimer);
        disconnectNoticeTimer = null;
      }
    };

    const onNotification = (notification: Notification) => {
      toast(notification.title, {
        description: notification.message
      });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["risk"] });
      queryClient.invalidateQueries({ queryKey: ["risk-narrative"] });
    };

    const onUploadProgress = () => {
      queryClient.invalidateQueries({ queryKey: ["uploads"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["risk"] });
      queryClient.invalidateQueries({ queryKey: ["risk-narrative"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    };

    const onConnect = () => {
      clearPendingNotice();
      if (reportedDisconnect) {
        toast.success("Live updates restored", { id: LIVE_STATUS_TOAST_ID });
      }
      reportedDisconnect = false;
    };

    const scheduleDisconnectNotice = () => {
      if (isIntentionalSocketDisconnect() || reportedDisconnect || disconnectNoticeTimer !== null) {
        return;
      }
      disconnectNoticeTimer = window.setTimeout(() => {
        disconnectNoticeTimer = null;
        if (isIntentionalSocketDisconnect() || socket.connected) return;
        reportedDisconnect = true;
        toast.info("Live updates paused — reconnecting automatically", {
          id: LIVE_STATUS_TOAST_ID
        });
      }, 5000);
    };

    const onDisconnect = (reason: string) => {
      if (reason === "io client disconnect" || isIntentionalSocketDisconnect()) {
        clearPendingNotice();
        toast.dismiss(LIVE_STATUS_TOAST_ID);
        return;
      }
      scheduleDisconnectNotice();
    };

    const onConnectError = () => {
      if (isIntentionalSocketDisconnect()) return;
      scheduleDisconnectNotice();
    };

    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", onDisconnect);
    socket.on("notification.created", onNotification);
    socket.on("upload.progress", onUploadProgress);

    return () => {
      clearPendingNotice();
      toast.dismiss(LIVE_STATUS_TOAST_ID);
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("disconnect", onDisconnect);
      socket.off("notification.created", onNotification);
      socket.off("upload.progress", onUploadProgress);
    };
  }, [queryClient]);
}
