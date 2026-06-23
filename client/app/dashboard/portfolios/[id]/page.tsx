"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RiskMetricsPanel } from "@/components/dashboard/RiskMetricsPanel";
import { RiskScoreCard } from "@/components/dashboard/RiskScoreCard";
import { TradeForm } from "@/components/forms/TradeForm";
import { TradeUploadBox } from "@/components/forms/TradeUploadBox";
import { HoldingsTable } from "@/components/tables/HoldingsTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { persistActivePortfolioId } from "@/hooks/useActivePortfolio";
import { usePortfolioSummary } from "@/hooks/usePortfolioSummary";
import { useRiskMetrics } from "@/hooks/useRiskMetrics";
import { apiRequest, getApiErrorMessage, jsonBody } from "@/lib/api";
import { isObjectId } from "@/lib/mongo";
import { formatCurrency } from "@/lib/utils";
import type { ActivityLog } from "@/types/activity";
import type { Holding, ReturnPoint } from "@/types/analytics";
import type { Portfolio } from "@/types/portfolio";
import type { Trade } from "@/types/trade";

const tradeEditSchema = z.object({
  symbol: z.string().trim().min(1, "Symbol is required").max(12, "Symbol must be 12 characters or fewer").regex(/^[A-Za-z][A-Za-z0-9.-]*$/, "Use a valid market symbol").transform((value) => value.toUpperCase()),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  price: z.coerce.number().positive("Price must be greater than zero"),
  fees: z.coerce.number().min(0, "Fees cannot be negative"),
  tradeDate: z.string().min(1, "Trade date is required")
});

type TradeEditValues = z.infer<typeof tradeEditSchema> & { id: string };

function invalidatePortfolioQueries(queryClient: ReturnType<typeof useQueryClient>, portfolioId: string): void {
  queryClient.invalidateQueries({ queryKey: ["summary", portfolioId] });
  queryClient.invalidateQueries({ queryKey: ["holdings", portfolioId] });
  queryClient.invalidateQueries({ queryKey: ["risk", portfolioId] });
  queryClient.invalidateQueries({ queryKey: ["returns", portfolioId] });
  queryClient.invalidateQueries({ queryKey: ["trades", portfolioId] });
  queryClient.invalidateQueries({ queryKey: ["activity", portfolioId] });
}

function tradeDateInput(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export default function PortfolioDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const portfolioId = params.id;
  const isValidPortfolioId = isObjectId(portfolioId);
  const [editingTrade, setEditingTrade] = useState<TradeEditValues | null>(null);

  const portfolioQuery = useQuery({
    queryKey: ["portfolio", portfolioId],
    queryFn: () => apiRequest<Portfolio>(`/portfolios/${portfolioId}`),
    enabled: isValidPortfolioId,
    retry: false
  });
  const portfolioReady = isValidPortfolioId && portfolioQuery.isSuccess;
  const summaryQuery = usePortfolioSummary(portfolioReady ? portfolioId : undefined);
  const riskQuery = useRiskMetrics(portfolioReady ? portfolioId : undefined);
  const holdingsQuery = useQuery({
    queryKey: ["holdings", portfolioId],
    queryFn: () => apiRequest<Holding[]>(`/portfolios/${portfolioId}/holdings`),
    enabled: portfolioReady
  });
  const returnsQuery = useQuery({
    queryKey: ["returns", portfolioId],
    queryFn: () => apiRequest<ReturnPoint[]>(`/portfolios/${portfolioId}/returns`),
    enabled: portfolioReady
  });
  const tradesQuery = useQuery({
    queryKey: ["trades", portfolioId],
    queryFn: () => apiRequest<Trade[]>(`/portfolios/${portfolioId}/trades?limit=20&sortBy=tradeDate&sortOrder=desc`),
    enabled: portfolioReady
  });
  const activityQuery = useQuery({
    queryKey: ["activity", portfolioId],
    queryFn: () => apiRequest<ActivityLog[]>(`/activity?portfolioId=${portfolioId}&limit=10`),
    enabled: portfolioReady
  });
  const updateTradeMutation = useMutation({
    mutationFn: (values: TradeEditValues) =>
      apiRequest<Trade>(`/trades/${values.id}`, {
        method: "PUT",
        body: jsonBody({
          symbol: values.symbol,
          side: values.side,
          quantity: values.quantity,
          price: values.price,
          fees: values.fees,
          tradeDate: new Date(values.tradeDate).toISOString()
        })
      }),
    onSuccess: () => {
      invalidatePortfolioQueries(queryClient, portfolioId);
      setEditingTrade(null);
      toast.success("Trade updated");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not update trade"))
  });
  const deleteTradeMutation = useMutation({
    mutationFn: (tradeId: string) =>
      apiRequest(`/trades/${tradeId}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      invalidatePortfolioQueries(queryClient, portfolioId);
      toast.success("Trade deleted");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not delete trade"))
  });

  useEffect(() => {
    if (portfolioReady) {
      persistActivePortfolioId(portfolioId);
    }
  }, [portfolioId, portfolioReady]);

  const summary = summaryQuery.data;
  const hasTrades = (summary?.tradeCount ?? 0) > 0;
  const loadingValue = summaryQuery.isLoading ? "Loading" : "-";

  function beginTradeEdit(trade: Trade): void {
    setEditingTrade({
      id: trade._id,
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      price: trade.price,
      fees: trade.fees ?? 0,
      tradeDate: tradeDateInput(trade.tradeDate)
    });
  }

  function saveTradeEdit(): void {
    if (!editingTrade) return;
    const parsed = tradeEditSchema.safeParse(editingTrade);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Fix trade details before saving");
      return;
    }
    updateTradeMutation.mutate({ ...parsed.data, id: editingTrade.id });
  }

  if (isValidPortfolioId && portfolioQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Opening the portfolio workspace...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isValidPortfolioId || portfolioQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio unavailable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {!isValidPortfolioId
              ? "The portfolio link is invalid. Return to the portfolio list and open the workspace again."
              : getApiErrorMessage(portfolioQuery.error, "This portfolio could not be loaded. It may have been deleted or you may not have access.")}
          </p>
          <Button asChild>
            <Link href="/dashboard/portfolios">Back to portfolios</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Portfolio detail</p>
          <h1 className="break-words text-2xl font-semibold sm:text-3xl">{portfolioQuery.data?.name ?? "Portfolio"}</h1>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/dashboard/portfolios">
            <ArrowLeft className="h-4 w-4" />
            Portfolios
          </Link>
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Value" value={hasTrades ? formatCurrency(summary?.totalPortfolioValue ?? 0) : loadingValue} />
        <MetricCard title="Invested" value={hasTrades ? formatCurrency(summary?.totalInvestedAmount ?? 0) : loadingValue} />
        <MetricCard title="Realized" value={hasTrades ? formatCurrency(summary?.realizedPnl ?? 0) : loadingValue} />
        <MetricCard
          title="Unrealized"
          value={hasTrades ? formatCurrency(summary?.unrealizedPnl ?? 0) : loadingValue}
          tone={(summary?.unrealizedPnl ?? 0) >= 0 ? "good" : "bad"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <PerformanceChart data={returnsQuery.data ?? []} />
        <RiskScoreCard risk={riskQuery.data} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <HoldingsTable holdings={holdingsQuery.data ?? []} />
        <RiskMetricsPanel risk={riskQuery.data} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <TradeUploadBox portfolioId={portfolioId} />
        <TradeForm portfolioId={portfolioId} />
      </div>

      <AlertsPanel portfolioId={portfolioId} />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent trades</CardTitle>
          </CardHeader>
          <CardContent>
            {tradesQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading trades...</p> : null}
            {tradesQuery.isError ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Trades could not be loaded. Retry after confirming the API is available.
              </div>
            ) : null}
            {!tradesQuery.isLoading && !tradesQuery.isError && (tradesQuery.data ?? []).length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No trades recorded yet.
              </div>
            ) : null}
            {(tradesQuery.data ?? []).length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Fees</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(tradesQuery.data ?? []).map((trade) => {
                      const isEditing = editingTrade?.id === trade._id;
                      return (
                        <TableRow key={trade._id}>
                          <TableCell className="min-w-36">
                            {isEditing && editingTrade ? (
                              <Input type="date" value={editingTrade.tradeDate} onChange={(event) => setEditingTrade({ ...editingTrade, tradeDate: event.target.value })} />
                            ) : (
                              new Date(trade.tradeDate).toISOString().slice(0, 10)
                            )}
                          </TableCell>
                          <TableCell className="min-w-32">
                            {isEditing && editingTrade ? (
                              <Input value={editingTrade.symbol} onChange={(event) => setEditingTrade({ ...editingTrade, symbol: event.target.value })} />
                            ) : (
                              trade.symbol
                            )}
                          </TableCell>
                          <TableCell className="min-w-28">
                            {isEditing && editingTrade ? (
                              <select
                                className="h-10 w-full rounded-md border bg-background px-3 text-sm font-medium outline-none transition focus:ring-2 focus:ring-ring"
                                value={editingTrade.side}
                                onChange={(event) => setEditingTrade({ ...editingTrade, side: event.target.value as Trade["side"] })}
                              >
                                <option value="BUY">BUY</option>
                                <option value="SELL">SELL</option>
                              </select>
                            ) : (
                              trade.side
                            )}
                          </TableCell>
                          <TableCell className="min-w-28 text-right">
                            {isEditing && editingTrade ? (
                              <Input type="number" step="0.0001" value={editingTrade.quantity} onChange={(event) => setEditingTrade({ ...editingTrade, quantity: Number(event.target.value) })} />
                            ) : (
                              trade.quantity
                            )}
                          </TableCell>
                          <TableCell className="min-w-32 text-right">
                            {isEditing && editingTrade ? (
                              <Input type="number" step="0.01" value={editingTrade.price} onChange={(event) => setEditingTrade({ ...editingTrade, price: Number(event.target.value) })} />
                            ) : (
                              formatCurrency(trade.price)
                            )}
                          </TableCell>
                          <TableCell className="min-w-28 text-right">
                            {isEditing && editingTrade ? (
                              <Input type="number" step="0.01" value={editingTrade.fees} onChange={(event) => setEditingTrade({ ...editingTrade, fees: Number(event.target.value) })} />
                            ) : (
                              formatCurrency(trade.fees ?? 0)
                            )}
                          </TableCell>
                          <TableCell className="min-w-40">
                            <div className="flex justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <Button size="sm" disabled={updateTradeMutation.isPending} onClick={saveTradeEdit}>
                                    <Check className="h-4 w-4" />
                                    Save
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => setEditingTrade(null)}>
                                    <X className="h-4 w-4" />
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button variant="outline" size="icon" className="h-9 w-9" aria-label={`Edit ${trade.symbol} trade`} onClick={() => beginTradeEdit(trade)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <ConfirmAction
                                    title="Delete trade?"
                                    description={`${trade.side} ${trade.quantity} ${trade.symbol} at ${formatCurrency(trade.price)}`}
                                    confirmLabel="Delete"
                                    variant="destructive"
                                    disabled={deleteTradeMutation.isPending}
                                    onConfirm={() => deleteTradeMutation.mutate(trade._id)}
                                    trigger={(open) => (
                                      <Button variant="outline" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" aria-label={`Delete ${trade.symbol} trade`} onClick={open}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  />
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <ActivityFeed items={activityQuery.data ?? []} />
      </div>
    </div>
  );
}
