"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { ReturnPoint } from "@/types/analytics";

export function PerformanceChart({ data, currency = "USD" }: { data: ReturnPoint[]; currency?: string }) {
  const symbol = currency === "INR" ? "₹" : "$";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Portfolio value</CardTitle>
        <CardDescription>Daily valuation curve across recorded snapshots</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No performance history yet. Daily snapshots populate the valuation curve once trades are recorded.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="valueFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={8} minTickGap={24} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${symbol}${Number(value / 1000).toFixed(0)}k`}
                  width={54}
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                <Area type="monotone" dataKey="totalValue" stroke="#0f766e" strokeWidth={2} fill="url(#valueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
