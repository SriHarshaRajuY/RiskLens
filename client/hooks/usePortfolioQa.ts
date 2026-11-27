"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, jsonBody } from "@/lib/api";
import type { PortfolioQaResponse } from "@/types/analytics";

export function usePortfolioQa(portfolioId?: string) {
  const [history, setHistory] = useState<PortfolioQaResponse[]>([]);

  useEffect(() => {
    setHistory([]);
  }, [portfolioId]);

  const mutation = useMutation({
    mutationFn: (question: string) => {
      if (!portfolioId) {
        return Promise.reject(new Error("No portfolio selected"));
      }
      return apiRequest<PortfolioQaResponse>(`/portfolios/${portfolioId}/qa`, {
        method: "POST",
        body: jsonBody({ question })
      });
    },
    onSuccess: (response) => {
      setHistory((prev) => [...prev, response]);
    }
  });

  return {
    history,
    askQuestion: (question: string) => mutation.mutateAsync(question),
    clearHistory: () => setHistory([]),
    isAsking: mutation.isPending
  };
}
