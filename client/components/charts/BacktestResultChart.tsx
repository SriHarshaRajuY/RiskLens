"use client";

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { BacktestResult } from "@/types/backtest";

function shortDate(value: unknown): string {
  const str = String(value ?? "");
  return str.length >= 10 ? str.slice(0, 10) : str;
}

export function BacktestResultChart({ result }: { result?: BacktestResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Equity curve</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {!result || result.equityCurve.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              No equity curve yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.equityCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={shortDate} minTickGap={28} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${Number(value / 1000).toFixed(1)}k`} width={56} />
                <Tooltip
                  labelFormatter={(label) => shortDate(label)}
                  formatter={(value) => [formatCurrency(Number(value)), "Portfolio equity"]}
                />
                <Line type="monotone" dataKey="value" stroke="#0f766e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
