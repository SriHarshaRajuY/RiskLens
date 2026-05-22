"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DatabaseZap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiRequest, getApiErrorMessage } from "@/lib/api";
import type { Portfolio } from "@/types/portfolio";

type SamplePortfolioResponse = {
  portfolio: Portfolio;
  created: boolean;
  importedTrades: number;
  snapshotsCreated: number;
  alertsConfigured: number;
};

export function SamplePortfolioButton({ variant = "outline" }: { variant?: "default" | "outline" | "secondary" }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<SamplePortfolioResponse>("/demo/sample-portfolio", {
        method: "POST",
        timeoutMs: 30_000
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      queryClient.invalidateQueries({ queryKey: ["summary", result.portfolio._id] });
      queryClient.invalidateQueries({ queryKey: ["holdings", result.portfolio._id] });
      queryClient.invalidateQueries({ queryKey: ["risk", result.portfolio._id] });
      queryClient.invalidateQueries({ queryKey: ["returns", result.portfolio._id] });
      toast.success(result.created ? "Sample portfolio loaded" : "Sample portfolio refreshed");
      router.push(`/dashboard/portfolios/${result.portfolio._id}`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not load the sample portfolio"));
    }
  });

  return (
    <Button variant={variant} onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      <DatabaseZap className="h-4 w-4" />
      {mutation.isPending ? "Loading sample..." : "Load sample portfolio"}
    </Button>
  );
}
