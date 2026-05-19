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
import { apiRequest, jsonBody } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { BacktestResult } from "@/types/backtest";

const schema = z.object({
  symbol: z.string().min(1).max(12),
  strategy: z.enum(["BUY_AND_HOLD", "MOVING_AVERAGE_CROSSOVER"]),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  shortWindow: z.coerce.number().int().positive(),
  longWindow: z.coerce.number().int().positive(),
  initialCapital: z.coerce.number().positive()
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
    onError: (error) => toast.error(error instanceof Error ? error.message : "Backtest failed")
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
                <Input {...form.register("symbol")} />
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
                  <Input type="date" {...form.register("startDate")} />
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input type="date" {...form.register("endDate")} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Short</Label>
                  <Input type="number" {...form.register("shortWindow")} />
                </div>
                <div className="space-y-2">
                  <Label>Long</Label>
                  <Input type="number" {...form.register("longWindow")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Capital</Label>
                <Input type="number" {...form.register("initialCapital")} />
              </div>
              <Button disabled={mutation.isPending}>
                <Play className="h-4 w-4" />
                Run
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard title="Final capital" value={formatCurrency(active?.finalCapital ?? 0)} />
            <MetricCard title="Return" value={`${(active?.totalReturn ?? 0).toFixed(2)}%`} tone={(active?.totalReturn ?? 0) >= 0 ? "good" : "bad"} />
            <MetricCard title="Drawdown" value={`${(active?.maxDrawdown ?? 0).toFixed(2)}%`} tone="warn" />
            <MetricCard title="Trades" value={String(active?.numberOfTrades ?? 0)} />
          </div>
          <BacktestResultChart result={active} />
        </div>
      </div>
    </div>
  );
}
