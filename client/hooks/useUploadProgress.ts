"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";

export type UploadProgress = {
  uploadJobId: string;
  portfolioId: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "PARTIAL_FAILURE";
  progress: number;
  processedRows?: number;
  validRows?: number;
  invalidRows?: number;
};

export function useUploadProgress(portfolioId?: string) {
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  useEffect(() => {
    setProgress(null);
    const socket = getSocket();
    if (!socket) return;

    const onProgress = (payload: UploadProgress) => {
      if (!portfolioId || payload.portfolioId === portfolioId) {
        setProgress(payload);
      }
    };

    socket.on("upload.progress", onProgress);
    socket.on("upload.queued", onProgress);

    return () => {
      socket.off("upload.progress", onProgress);
      socket.off("upload.queued", onProgress);
    };
  }, [portfolioId]);

  return progress;
}
