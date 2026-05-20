"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
      toast.success("Backtest completed");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Backtest failed"))
  });

  const active = latest ?? resultsQuery.data?.[0];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Strategy lab</p>
        <h1 className="text-3xl font-semibold">Backtesting</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Run backtest</CardTitle>
            <CardDescription>Buy-and-hold and moving-average crossover use daily historical prices.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
              <div className="space-y-2">
                <Label>Symbol</Label>
                <Input {...form.register("symbol")} aria-invalid={Boolean(form.formState.errors.symbol)} />
                {form.formState.errors.symbol ? <p className="text-sm text-destructive">{form.formState.errors.symbol.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Strategy</Label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("strategy")}>
                  <option value="BUY_AND_HOLD">Buy and hold</option>
                  <option value="MOVING_AVERAGE_CROSSOVER">Moving average crossover</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input type="date" {...form.register("startDate")} aria-invalid={Boolean(form.formState.errors.startDate)} />
                  {form.formState.errors.startDate ? <p className="text-sm text-destructive">{form.formState.errors.startDate.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input type="date" {...form.register("endDate")} aria-invalid={Boolean(form.formState.errors.endDate)} />
                  {form.formState.errors.endDate ? <p className="text-sm text-destructive">{form.formState.errors.endDate.message}</p> : null}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Short</Label>
                  <Input type="number" {...form.register("shortWindow")} aria-invalid={Boolean(form.formState.errors.shortWindow)} />
                  {form.formState.errors.shortWindow ? <p className="text-sm text-destructive">{form.formState.errors.shortWindow.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label>Long</Label>
                  <Input type="number" {...form.register("longWindow")} aria-invalid={Boolean(form.formState.errors.longWindow)} />
                  {form.formState.errors.longWindow ? <p className="text-sm text-destructive">{form.formState.errors.longWindow.message}</p> : null}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Capital</Label>
                <Input type="number" {...form.register("initialCapital")} aria-invalid={Boolean(form.formState.errors.initialCapital)} />
                {form.formState.errors.initialCapital ? <p className="text-sm text-destructive">{form.formState.errors.initialCapital.message}</p> : null}
              </div>
              <Button type="submit" disabled={mutation.isPending}>
                <Play className="h-4 w-4" />
                Run backtest
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-4">
          {active ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <MetricCard title="Final capital" value={formatCurrency(active.finalCapital)} />
                <MetricCard title="Return" value={`${active.totalReturn.toFixed(2)}%`} tone={active.totalReturn >= 0 ? "good" : "bad"} />
                <MetricCard title="Drawdown" value={`${active.maxDrawdown.toFixed(2)}%`} tone="warn" />
                <MetricCard title="Trades" value={String(active.numberOfTrades)} />
              </div>
              <BacktestResultChart result={active} />
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
