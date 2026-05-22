"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DatabaseZap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { persistActivePortfolioId } from "@/hooks/useActivePortfolio";
import { apiRequest, getApiErrorMessage } from "@/lib/api";
import { mongoId } from "@/lib/mongo";
import type { Portfolio } from "@/types/portfolio";

type StarterPortfolioResponse = {
  portfolio: Portfolio;
  created: boolean;
  importedTrades: number;
  snapshotsCreated: number;
  alertsConfigured: number;
};

export function StarterPortfolioButton({
  variant = "outline",
  confirmBeforeCreate = true
}: {
  variant?: "default" | "outline" | "secondary";
  confirmBeforeCreate?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<StarterPortfolioResponse>("/demo/sample-portfolio", {
        method: "POST",
        timeoutMs: 30_000
      }),
    onSuccess: (result) => {
      const portfolioId = mongoId(result.portfolio._id);
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      queryClient.invalidateQueries({ queryKey: ["summary", portfolioId] });
      queryClient.invalidateQueries({ queryKey: ["holdings", portfolioId] });
      queryClient.invalidateQueries({ queryKey: ["risk", portfolioId] });
      queryClient.invalidateQueries({ queryKey: ["returns", portfolioId] });
      if (portfolioId) {
        persistActivePortfolioId(portfolioId);
      }
      toast.success(result.created ? "Starter portfolio created" : "Starter portfolio refreshed");
      if (portfolioId) {
        router.push(`/dashboard/portfolios/${portfolioId}`);
      } else {
        toast.error("Portfolio created, but the returned id was invalid. Refresh the portfolio list.");
      }
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not create the starter portfolio"));
    }
  });

  const renderButton = (open: () => void) => (
    <Button
      className="w-full sm:w-auto"
      variant={variant}
      onClick={confirmBeforeCreate ? open : () => mutation.mutate()}
      disabled={mutation.isPending}
    >
      <DatabaseZap className="h-4 w-4" />
      {mutation.isPending ? "Creating..." : "Create starter portfolio"}
    </Button>
  );

  if (!confirmBeforeCreate) {
    return renderButton(() => undefined);
  }

  return (
    <ConfirmAction
      title="Create starter portfolio?"
      description="RiskLens will add a separate populated workspace."
      confirmLabel="Create"
      disabled={mutation.isPending}
      onConfirm={() => mutation.mutate()}
      trigger={renderButton}
    />
  );
}
