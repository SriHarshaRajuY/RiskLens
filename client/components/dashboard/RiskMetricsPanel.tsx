import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RiskMetrics } from "@/types/analytics";

export function RiskMetricsPanel({ risk, dailyReturn }: { risk?: RiskMetrics; dailyReturn?: number }) {
  if (!risk) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk metrics</CardTitle>
          <CardDescription>Statistical return dispersion and single-asset exposure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No risk metrics yet. Add trades to compute concentration and volatility.
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasReturnHistory = !risk.insufficientHistory && risk.dailyReturns.length > 0;
  const metrics = [
    {
      label: "Annualized volatility",
      value: hasReturnHistory ? `${(risk.annualizedVolatility * 100).toFixed(2)}%` : "Needs history",
      hint: "Daily return std dev × √252"
    },
    {
      label: "Sharpe ratio",
      value: hasReturnHistory ? risk.sharpeRatio.toFixed(2) : "Needs history",
      hint: "Return per unit of volatility"
    },
    {
      label: "Max drawdown",
      value: hasReturnHistory ? `${(risk.maxDrawdown * 100).toFixed(2)}%` : "Needs history",
      hint: "Largest peak-to-trough decline"
    },
    {
      label: "Value at Risk (95%)",
      value: hasReturnHistory ? `${(risk.valueAtRisk95 * 100).toFixed(2)}%` : "Needs history",
      hint: "5th percentile daily loss tail"
    },
    {
      label: "Concentration",
      value: `${(risk.concentrationRisk * 100).toFixed(2)}%`,
      hint: "Largest single-position weight"
    },
    {
      label: "Daily return",
      value: hasReturnHistory && typeof dailyReturn === "number" ? `${(dailyReturn * 100).toFixed(2)}%` : "Needs history",
      hint: "Latest daily valuation change"
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Risk metrics</CardTitle>
        <CardDescription>Key measures of portfolio swings, downside exposure, and concentration</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {risk.insufficientHistory ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">
            Return history is still limited. Volatility, Sharpe, Drawdown, and VaR populate automatically once 2+ daily snapshots are recorded.
          </div>
        ) : null}
        {metrics.map((item) => (
          <div key={item.label} className="rounded-lg border bg-muted/25 p-3.5 transition-colors hover:bg-muted/40">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-foreground">{item.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{item.hint}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
