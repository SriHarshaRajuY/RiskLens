"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

type ScenarioKey = "balanced" | "concentrated";
type PreviewTab = "overview" | "alerts" | "summary";

const scenarios: Record<
  ScenarioKey,
  {
    name: string;
    value: string;
    pnl: string;
    riskScore: number;
    riskLabel: string;
    riskTone: string;
    topHolding: string;
    topWeight: string;
    bars: number[];
    holdings: Array<{ symbol: string; weight: number; pnl: string }>;
    alerts: Array<{ rule: string; current: string; limit: string; breached: boolean }>;
    summaryText: string;
  }
> = {
  balanced: {
    name: "Balanced Core",
    value: "$148,420",
    pnl: "+$16,240 total gain",
    riskScore: 34,
    riskLabel: "Low–Medium",
    riskTone: "text-emerald-700 bg-emerald-50",
    topHolding: "MSFT",
    topWeight: "24.0%",
    bars: [42, 47, 45, 53, 51, 59, 58, 65, 64, 71, 70, 77, 79, 85],
    holdings: [
      { symbol: "MSFT", weight: 24, pnl: "+$5,120" },
      { symbol: "AAPL", weight: 22, pnl: "+$4,480" },
      { symbol: "VTI", weight: 32, pnl: "+$4,190" },
      { symbol: "NVDA", weight: 22, pnl: "+$2,450" }
    ],
    alerts: [
      { rule: "Single-asset concentration", current: "24.0%", limit: "30.0%", breached: false },
      { rule: "Max drawdown", current: "6.4%", limit: "15.0%", breached: false }
    ],
    summaryText:
      "Across 28 recorded trades and 4 holdings, your composite risk score is 34/100. Position weights remain well below your 30.0% concentration limit."
  },
  concentrated: {
    name: "Concentrated Tech",
    value: "$94,850",
    pnl: "+$11,920 total gain",
    riskScore: 68,
    riskLabel: "High exposure",
    riskTone: "text-red-700 bg-red-50",
    topHolding: "NVDA",
    topWeight: "46.5%",
    bars: [50, 58, 44, 62, 74, 52, 68, 82, 61, 73, 88, 69, 78, 92],
    holdings: [
      { symbol: "NVDA", weight: 46.5, pnl: "+$9,840" },
      { symbol: "TSLA", weight: 28.5, pnl: "+$1,210" },
      { symbol: "AMD", weight: 25.0, pnl: "+$870" }
    ],
    alerts: [
      { rule: "Single-asset concentration", current: "46.5%", limit: "30.0%", breached: true },
      { rule: "Annualized volatility", current: "31.2%", limit: "25.0%", breached: true }
    ],
    summaryText:
      "Across 19 recorded trades and 3 holdings, NVDA accounts for 46.5% of total market value, crossing your 30.0% concentration alert limit alongside elevated 31.2% annualized volatility."
  }
};

export function InteractivePreview() {
  const [scenario, setScenario] = useState<ScenarioKey>("balanced");
  const [tab, setTab] = useState<PreviewTab>("overview");
  const active = scenarios[scenario];

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3.5">
        <div>
          <p className="text-sm font-semibold text-slate-950">{active.name} Workspace</p>
          <p className="text-xs text-slate-500">Interactive preview — switch portfolio style below</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setScenario("balanced")}
            className={cn(
              "rounded-md px-2.5 py-1 transition-all",
              scenario === "balanced" ? "bg-white font-semibold text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            Balanced
          </button>
          <button
            type="button"
            onClick={() => setScenario("concentrated")}
            className={cn(
              "rounded-md px-2.5 py-1 transition-all",
              scenario === "concentrated" ? "bg-white font-semibold text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
          >
            High Concentration
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Portfolio value</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">{active.value}</p>
          <p className="mt-0.5 text-[11px] font-medium text-emerald-700">{active.pnl}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Risk score</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">{active.riskScore} / 100</p>
          <span className={cn("mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold", active.riskTone)}>
            {active.riskLabel}
          </span>
        </div>
        <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Top position</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">{active.topWeight}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{active.topHolding} share</p>
        </div>
      </div>

      <div className="mt-4 inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setTab("overview")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 transition-all",
            tab === "overview" ? "bg-white font-semibold text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-900"
          )}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Valuation
        </button>
        <button
          type="button"
          onClick={() => setTab("alerts")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 transition-all",
            tab === "alerts" ? "bg-white font-semibold text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-900"
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Alerts
        </button>
        <button
          type="button"
          onClick={() => setTab("summary")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 transition-all",
            tab === "summary" ? "bg-white font-semibold text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-900"
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          Summary
        </button>
      </div>

      <div className="mt-3 min-h-[156px]">
        {tab === "overview" ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 animate-in fade-in duration-150">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-900">Portfolio value over time</p>
              <span className="text-[11px] font-medium text-slate-500">Top holdings: {active.holdings.map((h) => h.symbol).join(", ")}</span>
            </div>
            <div className="flex h-24 items-end gap-1.5" aria-hidden="true">
              {active.bars.map((height, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex-1 rounded-t transition-all duration-300",
                    scenario === "concentrated"
                      ? "bg-gradient-to-t from-amber-600/80 to-amber-400/75"
                      : "bg-gradient-to-t from-emerald-700/80 to-teal-500/75"
                  )}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {tab === "alerts" ? (
          <div className="space-y-2.5 animate-in fade-in duration-150">
            {active.alerts.map((item) => (
              <div key={item.rule} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div>
                  <p className="text-xs font-semibold text-slate-900">{item.rule}</p>
                  <p className="mt-0.5 text-[11px] tabular-nums text-slate-500">
                    Current {item.current} · Limit {item.limit}
                  </p>
                </div>
                {item.breached ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                    <AlertTriangle className="h-3 w-3" />
                    Crossed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Within limit
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {tab === "summary" ? (
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                Risk &amp; Alert Summary
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 shadow-sm">
                <ShieldCheck className="h-3 w-3 text-emerald-700" />
                Informational only
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-700">{active.summaryText}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
