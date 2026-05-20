import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RiskMetrics } from "@/types/analytics";

export function RiskScoreCard({ risk }: { risk?: RiskMetrics }) {
  if (!risk) {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle>Risk score</CardTitle>
          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Risk score will appear after portfolio analytics are available.
          </div>
        </CardContent>
      </Card>
    );
  }

  const score = risk?.riskScore ?? 0;
  const level = risk?.riskLevel ?? "Low";
  const color = level === "High" ? "bg-red-500" : level === "Medium" ? "bg-amber-500" : "bg-emerald-500";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle>Risk score</CardTitle>
        <ShieldAlert className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-semibold">{score}</span>
          <Badge variant={level === "High" ? "destructive" : level === "Medium" ? "warning" : "success"}>{level}</Badge>
        </div>
        <div className="mt-5 h-2 rounded-full bg-muted">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
        </div>
        {risk?.insufficientHistory ? (
          <p className="mt-3 text-xs text-muted-foreground">More snapshots will improve volatility and VaR readings.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
