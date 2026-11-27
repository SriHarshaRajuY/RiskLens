"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type { RiskNarrative } from "@/types/analytics";

export function useRiskNarrative(portfolioId?: string) {
  const queryClient = useQueryClient();
  const queryKey = ["risk-narrative", portfolioId] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => apiRequest<RiskNarrative>(`/portfolios/${portfolioId}/risk-narrative`),
    enabled: Boolean(portfolioId),
    staleTime: 60_000
  });

  const refreshMutation = useMutation({
    mutationFn: () => {
      if (!portfolioId) {
        return Promise.reject(new Error("No portfolio selected"));
      }
      return apiRequest<RiskNarrative>(`/portfolios/${portfolioId}/risk-narrative?refresh=true`);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    }
  });

  return {
    ...query,
    refresh: () => refreshMutation.mutateAsync(),
    isRefreshing: refreshMutation.isPending
  };
}
