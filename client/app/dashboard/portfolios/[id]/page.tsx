"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RiskMetricsPanel } from "@/components/dashboard/RiskMetricsPanel";
import { RiskScoreCard } from "@/components/dashboard/RiskScoreCard";
import { TradeForm } from "@/components/forms/TradeForm";
import { TradeUploadBox } from "@/components/forms/TradeUploadBox";
import { HoldingsTable } from "@/components/tables/HoldingsTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePortfolioSummary } from "@/hooks/usePortfolioSummary";
import { useRiskMetrics } from "@/hooks/useRiskMetrics";
import { apiRequest } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { ActivityLog } from "@/types/activity";
import type { Holding, ReturnPoint } from "@/types/analytics";
import type { Portfolio } from "@/types/portfolio";
import type { Trade } from "@/types/trade";

export default function PortfolioDetailPage() {
  const params = useParams<{ id: string }>();
  const portfolioId = params.id;

  const portfolioQuery = useQuery({
    queryKey: ["portfolio", portfolioId],
    queryFn: () => apiRequest<Portfolio>(`/portfolios/${portfolioId}`)
  });
  const summaryQuery = usePortfolioSummary(portfolioId);
  const riskQuery = useRiskMetrics(portfolioId);
  const holdingsQuery = useQuery({
    queryKey: ["holdings", portfolioId],
    queryFn: () => apiRequest<Holding[]>(`/portfolios/${portfolioId}/holdings`)
  });
  const returnsQuery = useQuery({
    queryKey: ["returns", portfolioId],
    queryFn: () => apiRequest<ReturnPoint[]>(`/portfolios/${portfolioId}/returns`)
  });
  const tradesQuery = useQuery({
    queryKey: ["trades", portfolioId],
    queryFn: () => apiRequest<Trade[]>(`/portfolios/${portfolioId}/trades?limit=20&sortBy=tradeDate&sortOrder=desc`)
  });
  const activityQuery = useQuery({
    queryKey: ["activity", portfolioId],
    queryFn: () => apiRequest<ActivityLog[]>(`/activity?portfolioId=${portfolioId}&limit=10`)
  });

  const summary = summaryQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Portfolio detail</p>
        <h1 className="text-3xl font-semibold">{portfolioQuery.data?.name ?? "Portfolio"}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Value" value={formatCurrency(summary?.totalPortfolioValue ?? 0)} />
        <MetricCard title="Invested" value={formatCurrency(summary?.totalInvestedAmount ?? 0)} />
        <MetricCard title="Realized" value={formatCurrency(summary?.realizedPnl ?? 0)} />
        <MetricCard title="Unrealized" value={formatCurrency(summary?.unrealizedPnl ?? 0)} tone={(summary?.unrealizedPnl ?? 0) >= 0 ? "good" : "bad"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <PerformanceChart data={returnsQuery.data ?? []} />
        <RiskScoreCard risk={riskQuery.data} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <HoldingsTable holdings={holdingsQuery.data ?? []} />
        <RiskMetricsPanel risk={riskQuery.data} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TradeUploadBox portfolioId={portfolioId} />
        <TradeForm portfolioId={portfolioId} />
      </div>

      <AlertsPanel portfolioId={portfolioId} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent trades</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(tradesQuery.data ?? []).map((trade) => (
                  <TableRow key={trade._id}>
                    <TableCell>{new Date(trade.tradeDate).toISOString().slice(0, 10)}</TableCell>
                    <TableCell>{trade.symbol}</TableCell>
                    <TableCell>{trade.side}</TableCell>
                    <TableCell className="text-right">{trade.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(trade.price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <ActivityFeed items={activityQuery.data ?? []} />
      </div>
    </div>
  );
}
