"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bell } from "lucide-react";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { AllocationChart } from "@/components/charts/AllocationChart";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RiskMetricsPanel } from "@/components/dashboard/RiskMetricsPanel";
import { RiskScoreCard } from "@/components/dashboard/RiskScoreCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  const selected = portfoliosQuery.data?.[0];
  const summaryQuery = usePortfolioSummary(selected?._id);
  const riskQuery = useRiskMetrics(selected?._id);
  const returnsQuery = useQuery({
    queryKey: ["returns", selected?._id],
    queryFn: () => apiRequest<ReturnPoint[]>(`/portfolios/${selected?._id}/returns`),
    enabled: Boolean(selected?._id)
  });
  const activityQuery = useQuery({
    queryKey: ["activity", selected?._id],
    queryFn: () => apiRequest<ActivityLog[]>(`/activity?portfolioId=${selected?._id}&limit=8`),
    enabled: Boolean(selected?._id)
  });
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiRequest<Notification[]>("/notifications?isRead=false&limit=5")
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

  if (!selected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No portfolios yet</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/portfolios">Create portfolio</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const summary = summaryQuery.data;
  const hasTrades = (summary?.tradeCount ?? 0) > 0;
  const loadingValue = summaryQuery.isLoading ? "Loading" : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Primary portfolio</p>
          <h1 className="text-3xl font-semibold">{selected.name}</h1>
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/portfolios/${selected._id}`}>
            Open portfolio
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Portfolio value"
          value={hasTrades ? formatCurrency(summary?.totalPortfolioValue ?? 0) : loadingValue}
          detail={summaryQuery.isLoading ? "Loading analytics" : hasTrades ? `${summary?.holdingsCount ?? 0} holdings` : "Import trades to calculate"}
        />
        <MetricCard
          title="Total P&L"
          value={hasTrades ? formatCurrency(summary?.totalPnl ?? 0) : loadingValue}
          tone={(summary?.totalPnl ?? 0) >= 0 ? "good" : "bad"}
          detail={summaryQuery.isLoading ? "Loading analytics" : hasTrades ? `Daily ${formatCurrency(summary?.dailyPnl ?? 0)}` : "No P&L yet"}
        />
        <MetricCard title="Realized P&L" value={hasTrades ? formatCurrency(summary?.realizedPnl ?? 0) : loadingValue} tone="neutral" />
        <MetricCard
          title="Unrealized P&L"
          value={hasTrades ? formatCurrency(summary?.unrealizedPnl ?? 0) : loadingValue}
          tone={(summary?.unrealizedPnl ?? 0) >= 0 ? "good" : "bad"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <PerformanceChart data={returnsQuery.data ?? []} />
        <RiskScoreCard risk={riskQuery.data} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RiskMetricsPanel risk={riskQuery.data} />
        </div>
        <AllocationChart allocation={summary?.allocation ?? []} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
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
              <Link href="/dashboard/notifications">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
