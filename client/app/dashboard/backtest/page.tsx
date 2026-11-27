"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { BacktestResultChart } from "@/components/charts/BacktestResultChart";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, getApiErrorMessage, jsonBody } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { BacktestResult } from "@/types/backtest";

const schema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1, "Symbol is required")
    .max(12, "Symbol must be 12 characters or fewer")
    .regex(/^[A-Za-z][A-Za-z0-9.-]*$/, "Use a valid market symbol, for example AAPL")
    .transform((value) => value.toUpperCase()),
  strategy: z.enum(["BUY_AND_HOLD", "MOVING_AVERAGE_CROSSOVER"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  shortWindow: z.coerce.number().int().positive("Short window must be positive"),
  longWindow: z.coerce.number().int().positive("Long window must be positive"),
  initialCapital: z.coerce.number().positive("Initial capital must be greater than zero")
}).refine((input) => new Date(input.endDate) > new Date(input.startDate), {
  path: ["endDate"],
  message: "End date must be after start date"
}).refine((input) => input.longWindow > input.shortWindow, {
  path: ["longWindow"],
  message: "Long window must be greater than short window"
});

type Values = z.infer<typeof schema>;

export default function BacktestPage() {
  const [latest, setLatest] = useState<BacktestResult | undefined>();
  const queryClient = useQueryClient();
  const resultsQuery = useQuery({
    queryKey: ["backtests"],
    queryFn: () => apiRequest<BacktestResult[]>("/backtests")
  });
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      symbol: "AAPL",
      strategy: "MOVING_AVERAGE_CROSSOVER",
      startDate: "2024-01-01",
      endDate: "2025-01-01",
      shortWindow: 20,
      longWindow: 50,
      initialCapital: 10000
    }
  });
  const mutation = useMutation({
    mutationFn: (values: Values) =>
      apiRequest<BacktestResult>("/backtests", {
        method: "POST",
        body: jsonBody({
          ...values,
          startDate: new Date(values.startDate).toISOString(),
          endDate: new Date(values.endDate).toISOString()
        })
    }),
    onSuccess: (result) => {
      setLatest(result);
      queryClient.invalidateQueries({ queryKey: ["backtests"] });
      toast.success("Backtest completed");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Backtest failed"))
  });

  const active = latest ?? resultsQuery.data?.[0];

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-sm text-muted-foreground">Strategy lab</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Backtesting</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Symbol-level strategy results from historical daily prices.</p>
        </div>
      </div>

      <div className="grid items-start gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Run backtest</CardTitle>
            <CardDescription>Buy-and-hold and moving-average crossover use daily historical prices.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
              <div className="space-y-2.5">
                <Label>Symbol</Label>
                <Input {...form.register("symbol")} aria-invalid={Boolean(form.formState.errors.symbol)} />
                {form.formState.errors.symbol ? <p className="text-sm text-destructive">{form.formState.errors.symbol.message}</p> : null}
              </div>
              <div className="space-y-2.5">
                <Label>Strategy</Label>
                <select className="h-10 w-full rounded-lg border bg-background px-3.5 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20" {...form.register("strategy")}>
                  <option value="BUY_AND_HOLD">Buy and hold</option>
                  <option value="MOVING_AVERAGE_CROSSOVER">Moving average crossover</option>
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2.5">
                  <Label>Start</Label>
                  <Input type="date" {...form.register("startDate")} aria-invalid={Boolean(form.formState.errors.startDate)} />
                  {form.formState.errors.startDate ? <p className="text-sm text-destructive">{form.formState.errors.startDate.message}</p> : null}
                </div>
                <div className="space-y-2.5">
                  <Label>End</Label>
                  <Input type="date" {...form.register("endDate")} aria-invalid={Boolean(form.formState.errors.endDate)} />
                  {form.formState.errors.endDate ? <p className="text-sm text-destructive">{form.formState.errors.endDate.message}</p> : null}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2.5">
                  <Label>Short</Label>
                  <Input type="number" {...form.register("shortWindow")} aria-invalid={Boolean(form.formState.errors.shortWindow)} />
                  {form.formState.errors.shortWindow ? <p className="text-sm text-destructive">{form.formState.errors.shortWindow.message}</p> : null}
                </div>
                <div className="space-y-2.5">
                  <Label>Long</Label>
                  <Input type="number" {...form.register("longWindow")} aria-invalid={Boolean(form.formState.errors.longWindow)} />
                  {form.formState.errors.longWindow ? <p className="text-sm text-destructive">{form.formState.errors.longWindow.message}</p> : null}
                </div>
              </div>
              <div className="space-y-2.5">
                <Label>Capital</Label>
                <Input type="number" {...form.register("initialCapital")} aria-invalid={Boolean(form.formState.errors.initialCapital)} />
                {form.formState.errors.initialCapital ? <p className="text-sm text-destructive">{form.formState.errors.initialCapital.message}</p> : null}
              </div>
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                <Play className="h-4 w-4" />
                Run backtest
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-5">
          {active ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Final capital" value={formatCurrency(active.finalCapital)} />
                <MetricCard title="Return" value={`${active.totalReturn.toFixed(2)}%`} tone={active.totalReturn >= 0 ? "good" : "bad"} />
                <MetricCard title="Drawdown" value={`${active.maxDrawdown.toFixed(2)}%`} tone="warn" />
                <MetricCard title="Trades" value={String(active.numberOfTrades)} />
              </div>
              <BacktestResultChart result={active} />
              {active.dataSource ? (
                <Card>
                  <CardContent className="flex items-center justify-between p-4 text-xs text-muted-foreground">
                    <span>
                      Historical price feed:{" "}
                      <strong className="font-medium text-foreground">
                        {active.dataSource === "yahoo"
                          ? "Yahoo Finance (real daily closes)"
                          : active.dataSource === "stooq"
                            ? "Stooq (real daily closes)"
                            : active.dataSource === "alpha_vantage"
                              ? "Alpha Vantage (real daily closes)"
                              : "Simulated reference series"}
                      </strong>
                    </span>
                    <span className="font-mono">
                      Sharpe {active.sharpeRatio.toFixed(2)} · Win rate {active.winRate.toFixed(1)}%
                    </span>
                  </CardContent>
                </Card>
              ) : null}
              {(resultsQuery.data ?? []).length > 1 ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Recent backtests</CardTitle>
                    <CardDescription>Click a previous simulation to inspect its equity curve and metrics.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(resultsQuery.data ?? []).slice(0, 6).map((item) => {
                      const selected = active._id === item._id;
                      return (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => setLatest(item)}
                          className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-left text-xs transition-colors ${
                            selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <p className="font-semibold text-foreground">
                              {item.symbol} · {item.strategy.replaceAll("_", " ")}
                            </p>
                            <p className="text-muted-foreground">
                              {item.equityCurve.length >= 2
                                ? `${new Date(item.equityCurve[0]!.date).toISOString().slice(0, 10)} → ${new Date(item.equityCurve[item.equityCurve.length - 1]!.date).toISOString().slice(0, 10)}`
                                : new Date(item.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right tabular-nums">
                            <p className={`font-semibold ${item.totalReturn >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                              {item.totalReturn >= 0 ? "+" : ""}
                              {item.totalReturn.toFixed(2)}%
                            </p>
                            <p className="text-muted-foreground">{formatCurrency(item.finalCapital)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No backtests yet</CardTitle>
                <CardDescription>Run a strategy to generate return, drawdown, trade count, and equity curve results.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
