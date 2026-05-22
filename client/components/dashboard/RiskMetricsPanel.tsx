import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RiskMetrics } from "@/types/analytics";

export function RiskMetricsPanel({ risk }: { risk?: RiskMetrics }) {
  if (!risk) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Risk metrics will appear after trades and snapshots are available.
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasReturnHistory = !risk.insufficientHistory && risk.dailyReturns.length > 0;
  const metrics = [
    ["Volatility", hasReturnHistory ? `${(risk.annualizedVolatility * 100).toFixed(2)}%` : "Needs history"],
    ["Sharpe", hasReturnHistory ? risk.sharpeRatio.toFixed(2) : "Needs history"],
    ["Max drawdown", hasReturnHistory ? `${(risk.maxDrawdown * 100).toFixed(2)}%` : "Needs history"],
    ["VaR 95", hasReturnHistory ? `${(risk.valueAtRisk95 * 100).toFixed(2)}%` : "Needs history"],
    ["Concentration", `${(risk.concentrationRisk * 100).toFixed(2)}%`]
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk metrics</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {risk.insufficientHistory ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground sm:col-span-2">
            Risk metrics that depend on returns will become more meaningful after portfolio snapshots are generated.
          </div>
        ) : null}
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
