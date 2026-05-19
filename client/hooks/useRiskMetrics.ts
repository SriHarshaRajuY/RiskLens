"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type { RiskMetrics } from "@/types/analytics";

export function useRiskMetrics(portfolioId?: string) {
  return useQuery({
    queryKey: ["risk", portfolioId],
    queryFn: () => apiRequest<RiskMetrics>(`/portfolios/${portfolioId}/risk`),
    enabled: Boolean(portfolioId)
  });
}
