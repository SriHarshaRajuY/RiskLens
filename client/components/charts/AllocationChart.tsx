"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { PortfolioSummary } from "@/types/analytics";

const COLORS = [
  "#0f766e",
  "#2563eb",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#059669",
  "#0284c7",
  "#db2777",
  "#65a30d",
  "#ea580c"
];

export function AllocationChart({
  allocation,
  currency = "USD"
}: {
  allocation: PortfolioSummary["allocation"];
  currency?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Allocation</CardTitle>
        <CardDescription>Market value share across open positions</CardDescription>
      </CardHeader>
      <CardContent>
        {allocation.length === 0 ? (
          <div className="flex h-44 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No allocation yet.
          </div>
        ) : (
          <div className="grid items-center gap-6 lg:grid-cols-[200px_1fr]">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocation} dataKey="value" nameKey="symbol" innerRadius={50} outerRadius={82} paddingAngle={2}>
                    {allocation.map((entry, index) => (
                      <Cell key={entry.symbol} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(Number(value), currency), String(name)]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {allocation.map((entry, index) => (
                <div key={entry.symbol} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="truncate font-semibold">{entry.symbol}</span>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <span className="font-medium text-foreground">{entry.percent.toFixed(1)}%</span>
                    <span className="ml-2 text-xs text-muted-foreground">{formatCurrency(entry.value, currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
