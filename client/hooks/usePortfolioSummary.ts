"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type { PortfolioSummary } from "@/types/analytics";

export function usePortfolioSummary(portfolioId?: string) {
  return useQuery({
    queryKey: ["summary", portfolioId],
    queryFn: () => apiRequest<PortfolioSummary>(`/portfolios/${portfolioId}/summary`),
    enabled: Boolean(portfolioId)
  });
}
