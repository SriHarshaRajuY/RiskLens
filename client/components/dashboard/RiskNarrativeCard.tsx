"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  FileText,
  Info,
  RefreshCw,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRiskNarrative } from "@/hooks/useRiskNarrative";
import { getApiErrorMessage } from "@/lib/api";
import type { AlertNarrativeItem, NarrativeFallbackReason, RiskNarrative } from "@/types/analytics";

type NarrativeTab = "metrics" | "alerts" | "notes";

function fallbackLabel(reason?: NarrativeFallbackReason): string {
  switch (reason) {
    case "missing_api_key":
      return "Built-in Risk Engine";
    case "quota_exceeded":
      return "Standard Engine · AI Busy";
    case "timeout":
    case "invalid_output":
    case "provider_error":
    default:
      return "Standard Engine";
  }
}

function alertStatusBadge(status: AlertNarrativeItem["status"]) {
  if (status === "BREACHED") {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Breached
      </Badge>
    );
  }
  if (status === "WITHIN_THRESHOLD") {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Within threshold
      </Badge>
    );
  }
  return <Badge variant="secondary">Inactive</Badge>;
}

function formatAuditCopy(data: RiskNarrative): string {
  const lines: string[] = [
    "RISKLENS DESCRIPTIVE RISK & ALERT NARRATIVE",
    `Generated: ${new Date(data.generatedAt).toLocaleString()} | Engine: ${data.source}${data.model ? ` (${data.model})` : ""}`,
    "",
    "EXECUTIVE SUMMARY",
    data.executiveSummary,
    "",
    "METRIC EXPLANATIONS",
    ...data.metricExplanations.map(
      (m) => `- ${m.metric} (${m.valueLabel}): ${m.mathematicalMeaning} Driver: ${m.historicalDriver}`
    )
  ];

  if (data.alertNarratives.length > 0) {
    lines.push(
      "",
      "ALERT STATES",
      ...data.alertNarratives.map(
        (a) =>
          `- ${a.alertType.replaceAll("_", " ")} [${a.status}] (${a.currentValueLabel} vs ${a.thresholdLabel}): ${a.factualExplanation}`
      )
    );
  }

  if (data.dataLimitations.length > 0) {
    lines.push("", "DATA LIMITATIONS", ...data.dataLimitations.map((d) => `- ${d}`));
  }

  lines.push("", `DISCLAIMER: ${data.disclaimer}`);
  return lines.join("\n");
}

export function RiskNarrativeCard({
  portfolioId,
  defaultTab = "metrics"
}: {
  portfolioId: string;
  defaultTab?: NarrativeTab;
}) {
  const [activeTab, setActiveTab] = useState<NarrativeTab>(defaultTab);
  const { data, isLoading, isError, error, refetch, refresh, isRefreshing } = useRiskNarrative(portfolioId);

  async function handleRefresh(): Promise<void> {
    try {
      const updated = await refresh();
      toast.success(updated.source === "gemini" ? "Risk summary refreshed with AI" : "Risk summary refreshed");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not regenerate risk narrative"));
    }
  }

  async function handleCopy(): Promise<void> {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(formatAuditCopy(data));
      toast.success("Narrative report copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  function handleDownload(): void {
    if (!data) return;
    const content = formatAuditCopy(data);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `risklens-narrative-${new Date(data.generatedAt).toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Audit memo downloaded");
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Descriptive Risk &amp; Alert Narrator</CardTitle>
          <CardDescription>Factual, backward-looking explanation of computed risk metrics and alert states.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {getApiErrorMessage(error, "Risk narrative could not be loaded right now.")}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isGemini = data.source === "gemini";
  const breachedCount = data.alertNarratives.filter((item) => item.status === "BREACHED").length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-4 border-b bg-muted/20 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              {isGemini ? (
                <Sparkles className="h-5 w-5 text-primary" />
              ) : (
                <Cpu className="h-5 w-5 text-muted-foreground" />
              )}
              Risk &amp; Alert Summary
            </CardTitle>
            {isGemini ? (
              <Badge variant="secondary" className="border-primary/30 bg-primary/10 text-primary">
                AI Enhanced
              </Badge>
            ) : (
              <Badge variant="secondary">
                {fallbackLabel(data.fallbackReason)}
              </Badge>
            )}
          </div>
          <CardDescription>
            Factual, backward-looking explanation of computed risk figures and alert thresholds.
          </CardDescription>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Regenerate"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        <div className="rounded-xl border border-l-4 border-l-primary bg-muted/30 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Executive Summary</p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">{data.executiveSummary}</p>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border bg-muted/40 p-1">
          <Button
            type="button"
            variant={activeTab === "metrics" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("metrics")}
          >
            <FileText className="h-3.5 w-3.5" />
            Metrics ({data.metricExplanations.length})
          </Button>
          <Button
            type="button"
            variant={activeTab === "alerts" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("alerts")}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Alerts ({data.alertNarratives.length})
            {breachedCount > 0 ? (
              <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground">
                {breachedCount} breached
              </span>
            ) : null}
          </Button>
          <Button
            type="button"
            variant={activeTab === "notes" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("notes")}
          >
            <Info className="h-3.5 w-3.5" />
            Data Notes ({data.dataLimitations.length})
          </Button>
        </div>

        {activeTab === "metrics" ? (
          <div key="metrics" className="grid gap-3.5 md:grid-cols-2 animate-in fade-in duration-150">
            {data.metricExplanations.map((item) => (
              <div key={item.metric} className="flex flex-col justify-between rounded-xl border bg-card p-4 transition-colors hover:border-border">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold">{item.metric}</h4>
                    <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                      {item.valueLabel}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Definition: </span>
                    {item.mathematicalMeaning}
                  </p>
                </div>
                <p className="mt-2.5 border-t pt-2.5 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Historical driver: </span>
                  {item.historicalDriver}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "alerts" ? (
          data.alertNarratives.length === 0 ? (
            <div key="alerts-empty" className="flex flex-col items-start justify-between gap-3 rounded-xl border border-dashed p-4 animate-in fade-in duration-150 sm:flex-row sm:items-center">
              <p className="text-sm text-muted-foreground">
                No risk alerts are configured for this portfolio yet.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/alerts">Configure alerts</Link>
              </Button>
            </div>
          ) : (
            <div key="alerts" className="space-y-3 animate-in fade-in duration-150">
              {data.alertNarratives.map((alert, idx) => (
                <div key={`${alert.alertType}-${idx}`} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{alert.alertType.replaceAll("_", " ")}</span>
                      {alertStatusBadge(alert.status)}
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      Observed {alert.currentValueLabel} · Threshold {alert.thresholdLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{alert.factualExplanation}</p>
                </div>
              ))}
            </div>
          )
        ) : null}

        {activeTab === "notes" ? (
          data.dataLimitations.length === 0 ? (
            <div key="notes-empty" className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground animate-in fade-in duration-150">
              All trade, snapshot, and alert inputs are present for this narrative.
            </div>
          ) : (
            <ul key="notes" className="space-y-2 animate-in fade-in duration-150">
              {data.dataLimitations.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          )
        ) : null}

        <div className="flex flex-col gap-2 rounded-md border bg-muted/20 px-3 py-2.5 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
            {data.disclaimer}
          </span>
          <span className="shrink-0 font-mono">
            {new Date(data.generatedAt).toLocaleTimeString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
