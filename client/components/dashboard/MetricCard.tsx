import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  title,
  value,
  detail,
  tone = "neutral",
  icon
}: {
  title: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
  icon?: ReactNode;
}) {
  const toneClass = {
    neutral: "text-foreground",
    good: "text-emerald-700",
    warn: "text-amber-700",
    bad: "text-red-700"
  }[tone];

  const accentBorder = {
    neutral: "border-t-border/80",
    good: "border-t-emerald-500/70",
    warn: "border-t-amber-500/70",
    bad: "border-t-red-500/70"
  }[tone];

  return (
    <Card className={cn("min-h-[120px] border-t-2 hover:border-border", accentBorder)}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</CardTitle>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </CardHeader>
      <CardContent>
        <p className={cn("text-2xl font-semibold tabular-nums leading-tight sm:text-[28px]", toneClass)}>{value}</p>
        {detail ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
