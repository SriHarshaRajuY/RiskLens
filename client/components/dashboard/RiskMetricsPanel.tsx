import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RiskMetrics } from "@/types/analytics";

export function RiskMetricsPanel({ risk }: { risk?: RiskMetrics }) {
  const metrics = [
    ["Volatility", `${((risk?.annualizedVolatility ?? 0) * 100).toFixed(2)}%`],
    ["Sharpe", (risk?.sharpeRatio ?? 0).toFixed(2)],
    ["Max drawdown", `${((risk?.maxDrawdown ?? 0) * 100).toFixed(2)}%`],
    ["VaR 95", `${((risk?.valueAtRisk95 ?? 0) * 100).toFixed(2)}%`],
    ["Concentration", `${((risk?.concentrationRisk ?? 0) * 100).toFixed(2)}%`]
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk metrics</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs uppercase text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-semibold">{value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
