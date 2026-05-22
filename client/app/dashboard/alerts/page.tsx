"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { WorkspaceHeader } from "@/components/dashboard/WorkspaceHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { apiRequest } from "@/lib/api";
import type { Portfolio } from "@/types/portfolio";

export default function AlertsPage() {
  const portfoliosQuery = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => apiRequest<Portfolio[]>("/portfolios?limit=20")
  });
  const portfolios = portfoliosQuery.data ?? [];
  const {
    activePortfolio: portfolio,
    activePortfolioId: portfolioId,
    setActivePortfolioId
  } = useActivePortfolio(portfolios);

  if (portfoliosQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Checking your portfolios...</p>
        </CardContent>
      </Card>
    );
  }

  if (portfoliosQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alerts unavailable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">RiskLens could not load your portfolios for alert management.</p>
          <Button onClick={() => portfoliosQuery.refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (portfolios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No portfolio selected</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/portfolios">Create portfolio</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!portfolio || !portfolioId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Choose a portfolio to manage its risk alerts.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Alert center"
        title={portfolio.name}
        description="Risk thresholds for the selected portfolio."
        portfolios={portfolios}
        activePortfolioId={portfolioId}
        onPortfolioChange={setActivePortfolioId}
        openHref={`/dashboard/portfolios/${portfolioId}`}
        openLabel="Open details"
      />
      <AlertsPanel portfolioId={portfolioId} />
    </div>
  );
}
