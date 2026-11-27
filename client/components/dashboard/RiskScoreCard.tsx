import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RiskMetrics } from "@/types/analytics";

export function RiskScoreCard({ risk }: { risk?: RiskMetrics }) {
  if (!risk) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Risk score</CardTitle>
            <CardDescription>Composite exposure tier (0–100)</CardDescription>
          </div>
          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex-1">
          <div className="flex h-full min-h-[140px] items-center justify-center rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Add trades to calculate composite risk score.
          </div>
        </CardContent>
      </Card>
    );
  }

  const score = risk.riskScore ?? 0;
  const level = risk.riskLevel ?? "Low";
  const color = level === "High" ? "bg-red-500" : level === "Medium" ? "bg-amber-500" : "bg-emerald-500";
  const hasHistory = !risk.insufficientHistory && risk.dailyReturns.length > 0;

  const components = [
    {
      label: "Annualized volatility",
      weight: "30%",
      pct: Math.min((risk.annualizedVolatility / 0.45) * 100, 100),
      value: hasHistory ? `${(risk.annualizedVolatility * 100).toFixed(1)}%` : "Pending"
    },
    {
      label: "Max drawdown",
      weight: "30%",
      pct: Math.min((risk.maxDrawdown / 0.35) * 100, 100),
      value: hasHistory ? `${(risk.maxDrawdown * 100).toFixed(1)}%` : "Pending"
    },
    {
      label: "Concentration",
      weight: "20%",
      pct: Math.min((risk.concentrationRisk / 0.6) * 100, 100),
      value: `${(risk.concentrationRisk * 100).toFixed(1)}%`
    },
    {
      label: "Value at Risk (95%)",
      weight: "20%",
      pct: Math.min((risk.valueAtRisk95 / 0.08) * 100, 100),
      value: hasHistory ? `${(risk.valueAtRisk95 * 100).toFixed(1)}%` : "Pending"
    }
  ];

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between pb-3">
        <div>
          <CardTitle>Risk score</CardTitle>
          <CardDescription>Weighted historical risk index</CardDescription>
        </div>
        <ShieldAlert className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between space-y-5">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold tabular-nums tracking-tight">{score}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            <Badge variant={level === "High" ? "destructive" : level === "Medium" ? "warning" : "success"}>
              {level} risk
            </Badge>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
              style={{ width: `${Math.min(Math.max(score, 2), 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          {components.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {item.label} <span className="text-[11px] opacity-75">({item.weight})</span>
                </span>
                <span className="font-medium tabular-nums text-foreground">{item.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/75 transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(Math.max(item.pct, 0), 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {risk.insufficientHistory ? (
          <p className="rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
            Return-series metrics finalize once 2+ daily snapshots exist.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
