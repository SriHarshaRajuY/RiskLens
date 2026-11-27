"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { AllocationChart } from "@/components/charts/AllocationChart";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RiskMetricsPanel } from "@/components/dashboard/RiskMetricsPanel";
import { RiskNarrativeCard } from "@/components/dashboard/RiskNarrativeCard";
import { RiskScoreCard } from "@/components/dashboard/RiskScoreCard";
import { WorkspaceHeader } from "@/components/dashboard/WorkspaceHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { usePortfolioSummary } from "@/hooks/usePortfolioSummary";
import { useRiskMetrics } from "@/hooks/useRiskMetrics";
import { apiRequest } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { ActivityLog } from "@/types/activity";
import type { ReturnPoint } from "@/types/analytics";
import type { Notification } from "@/types/notification";
import type { Portfolio } from "@/types/portfolio";

export default function DashboardPage() {
  const portfoliosQuery = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => apiRequest<Portfolio[]>("/portfolios?limit=20")
  });
  const portfolios = portfoliosQuery.data ?? [];
  const {
    activePortfolio: selected,
    activePortfolioId: selectedPortfolioId,
    setActivePortfolioId
  } = useActivePortfolio(portfolios);
  const summaryQuery = usePortfolioSummary(selectedPortfolioId);
  const riskQuery = useRiskMetrics(selectedPortfolioId);
  const returnsQuery = useQuery({
    queryKey: ["returns", selectedPortfolioId],
    queryFn: () => apiRequest<ReturnPoint[]>(`/portfolios/${selectedPortfolioId}/returns`),
    enabled: Boolean(selectedPortfolioId)
  });
  const activityQuery = useQuery({
    queryKey: ["activity", selectedPortfolioId],
    queryFn: () => apiRequest<ActivityLog[]>(`/activity?portfolioId=${selectedPortfolioId}&limit=8`),
    enabled: Boolean(selectedPortfolioId)
  });
  const notificationsQuery = useQuery({
    queryKey: ["notifications", selectedPortfolioId, "unread"],
    queryFn: () => apiRequest<Notification[]>(`/notifications?isRead=false&limit=5&portfolioId=${selectedPortfolioId}`),
    enabled: Boolean(selectedPortfolioId)
  });

  if (portfoliosQuery.isLoading) {
    return <Skeleton className="h-[520px] w-full" />;
  }

  if (portfoliosQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard unavailable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">RiskLens could not load your portfolios. Please retry the request.</p>
          <Button onClick={() => portfoliosQuery.refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (portfolios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No portfolios yet</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/dashboard/portfolios">Create portfolio</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!selected || !selectedPortfolioId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio list needs refresh</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">One portfolio returned an invalid identifier. Refresh the portfolio list before opening it.</p>
          <Button onClick={() => portfoliosQuery.refetch()}>Refresh portfolios</Button>
        </CardContent>
      </Card>
    );
  }

  const summary = summaryQuery.data;
  const currency = summary?.baseCurrency ?? selected.baseCurrency ?? "USD";
  const hasTrades = (summary?.tradeCount ?? 0) > 0;
  const loadingValue = summaryQuery.isLoading ? "Loading" : "-";

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Portfolio overview"
        title={selected.name}
        description="Value, P&L, allocation, risk, activity, and unread events."
        portfolios={portfolios}
        activePortfolioId={selectedPortfolioId}
        onPortfolioChange={setActivePortfolioId}
        openHref={`/dashboard/portfolios/${selectedPortfolioId}`}
        openLabel="Open details"
      />

      {!summaryQuery.isLoading && !hasTrades ? (
        <Card className="border-primary/25 bg-primary/[0.03]">
          <CardHeader className="pb-3">
            <CardTitle>Get started with {selected.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm text-muted-foreground">
              Your portfolio workspace is ready. Add a trade or upload a CSV file to calculate holdings, risk metrics, and your Risk &amp; Alert Summary.
            </p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={`/dashboard/portfolios/${selectedPortfolioId}`}>Add trades or CSV</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/alerts">Set risk alerts</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Portfolio value"
          value={hasTrades ? formatCurrency(summary?.totalPortfolioValue ?? 0, currency) : loadingValue}
          detail={summaryQuery.isLoading ? "Loading analytics" : hasTrades ? `${summary?.holdingsCount ?? 0} holdings` : "Import trades to calculate"}
        />
        <MetricCard
          title="Total P&L"
          value={hasTrades ? formatCurrency(summary?.totalPnl ?? 0, currency) : loadingValue}
          tone={(summary?.totalPnl ?? 0) >= 0 ? "good" : "bad"}
          detail={summaryQuery.isLoading ? "Loading analytics" : hasTrades ? `Daily ${formatCurrency(summary?.dailyPnl ?? 0, currency)}` : "No P&L yet"}
        />
        <MetricCard title="Realized P&L" value={hasTrades ? formatCurrency(summary?.realizedPnl ?? 0, currency) : loadingValue} tone="neutral" />
        <MetricCard
          title="Unrealized P&L"
          value={hasTrades ? formatCurrency(summary?.unrealizedPnl ?? 0, currency) : loadingValue}
          tone={(summary?.unrealizedPnl ?? 0) >= 0 ? "good" : "bad"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <PerformanceChart data={returnsQuery.data ?? []} currency={currency} />
        <RiskScoreCard risk={riskQuery.data} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RiskMetricsPanel risk={riskQuery.data} dailyReturn={summary?.dailyReturn} />
        </div>
        <AllocationChart allocation={summary?.allocation ?? []} />
      </div>

      <RiskNarrativeCard portfolioId={selectedPortfolioId} />

      <div className="grid gap-5 xl:grid-cols-2">
        <ActivityFeed items={activityQuery.data ?? []} />
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Unread notifications</CardTitle>
            <Bell className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {(notificationsQuery.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nothing unread.</p> : null}
            {(notificationsQuery.data ?? []).map((item) => (
              <div key={item._id} className="rounded-md border p-3">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
              </div>
            ))}
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/notifications">View all</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
