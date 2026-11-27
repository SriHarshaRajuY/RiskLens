import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  DatabaseZap,
  FileText,
  LineChart,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UploadCloud
} from "lucide-react";
import { Button } from "@/components/ui/button";

const capabilities = [
  {
    title: "Trade history intake",
    description: "Import CSV trade ledgers or add records manually with strict validation and row-level error diagnostics.",
    icon: UploadCloud
  },
  {
    title: "Portfolio analytics",
    description: "Track open holdings, allocation weights, realized and unrealized P&L, and daily return curves.",
    icon: LineChart
  },
  {
    title: "Risk monitoring",
    description: "Configure portfolio thresholds for daily loss, max drawdown, concentration, and annualized volatility.",
    icon: BellRing
  },
  {
    title: "Descriptive risk narrator",
    description: "Read factual, audit-ready explanations of risk metrics and alert breaches with automatic fallback.",
    icon: FileText
  }
];

const workflow = [
  ["Create portfolio", "Set up a dedicated USD or INR workspace for trades, alerts, activity, and analytics."],
  ["Import trades", "Upload CSV history or enter trades manually with oversell protection before records are saved."],
  ["Review analytics & narrative", "Inspect risk score drivers, allocation weights, and non-advisory metric explanations."],
  ["Evaluate strategy", "Run buy-and-hold and moving-average crossover backtests on historical daily price series."]
];

const platform = [
  ["Regulator-safe reporting", "Risk narratives explain historical math and ledger facts without investment advice."],
  ["Background CSV workers", "Large CSV uploads process asynchronously via BullMQ while you continue reviewing analytics."],
  ["Realtime synchronization", "Socket.IO pushes live upload progress, triggered alerts, and notifications without manual reloads."],
  ["Deterministic resilience", "Both market pricing and the risk narrator automatically fall back to deterministic engines offline."]
];

function PreviewPanel() {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3.5">
        <div>
          <p className="text-sm font-semibold text-slate-950">Core Equity Workspace</p>
          <p className="text-xs text-slate-500">Holdings, risk posture, alerts &amp; audit narrator</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Monitored
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">USD</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Portfolio value</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">$148,420</p>
          <p className="mt-0.5 text-[11px] font-medium text-emerald-700">+$16,240 total P&amp;L</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Risk score</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">42 / 100</p>
          <p className="mt-0.5 text-[11px] font-medium text-amber-700">Medium exposure</p>
        </div>
        <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Concentration</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">31.4%</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Top holding: AAPL</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-900">Portfolio valuation curve</p>
          <BarChart3 className="h-4 w-4 text-emerald-700" />
        </div>
        <div className="flex h-24 items-end gap-1.5" aria-hidden="true">
          {[38, 44, 41, 52, 49, 61, 58, 66, 63, 75, 72, 86, 84, 92].map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-t bg-gradient-to-t from-emerald-700/80 to-teal-500/75 transition-all"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
            <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
            Descriptive Risk &amp; Alert Narrator
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 shadow-sm">
            <ShieldCheck className="h-3 w-3 text-emerald-700" />
            Non-advisory
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-700">
          Based on 24 recorded trades across 5 holdings, composite risk sits at 42/100 (Medium). AAPL represents 31.4% of open value, exceeding your 25.0% concentration rule.
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f5f7f2] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f5f7f2]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm">
              <Activity className="h-5 w-5" />
            </span>
            RiskLens
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex" aria-label="Primary navigation">
            <a href="#capabilities" className="transition-colors hover:text-slate-950">
              Capabilities
            </a>
            <a href="#workflow" className="transition-colors hover:text-slate-950">
              Workflow
            </a>
            <a href="#platform" className="transition-colors hover:text-slate-950">
              Platform
            </a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Create account</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_12%_18%,rgba(16,185,129,0.15),transparent_32%),linear-gradient(135deg,#f5f7f2_0%,#eef5ed_48%,#f8fafc_100%)]">
        <div className="absolute inset-0 dashboard-grid opacity-65" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
          <div className="max-w-xl animate-page-enter">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/85 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              Portfolio risk &amp; audit workspace
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Clear portfolio risk, zero guesswork.
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-700 sm:text-lg">
              Import trades, track real holdings and P&amp;L, monitor drawdown and concentration thresholds, and inspect factual, non-advisory risk explanations in one workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/register">
                  Create free workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full border-slate-300 bg-white/85 sm:w-auto">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-3 text-xs font-medium text-slate-700 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200/90 bg-white/80 px-4 py-3 shadow-sm">
                <p className="font-semibold text-slate-950">CSV + Manual</p>
                <p className="mt-0.5 text-slate-500">Validated trade ledger</p>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white/80 px-4 py-3 shadow-sm">
                <p className="font-semibold text-slate-950">Live Alerts</p>
                <p className="mt-0.5 text-slate-500">Threshold breach feeds</p>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white/80 px-4 py-3 shadow-sm">
                <p className="font-semibold text-slate-950">Audit Narrator</p>
                <p className="mt-0.5 text-slate-500">Gemini + fallback engine</p>
              </div>
            </div>
          </div>

          <div className="animate-page-enter">
            <PreviewPanel />
          </div>
        </div>
      </section>

      <section id="capabilities" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Capabilities</p>
            <h2 className="mt-2.5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Everything needed for disciplined portfolio review
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              RiskLens keeps trade records, deterministic risk analytics, alerting, and factual explanations in one consistent workflow.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="workflow" className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Workflow</p>
            <h2 className="mt-2.5 text-3xl font-semibold tracking-tight text-slate-950">From raw trades to audit-ready clarity</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Built around a practical recordkeeping loop: ingest trades, compute risk posture, monitor breaches, and export factual summaries.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {workflow.map(([title, description], index) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-[#f8faf7] p-5 transition-colors hover:bg-[#f2f7f1]">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Step {index + 1}</p>
                <h3 className="mt-2.5 text-base font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="platform" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Platform</p>
              <h2 className="mt-2.5 text-3xl font-semibold tracking-tight text-slate-950">Engineered for reliability and compliance</h2>
            </div>
            <Button asChild variant="outline" className="w-full bg-white sm:w-auto">
              <Link href="/register">
                Open workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {platform.map(([title, description], index) => {
              const icons = [DatabaseZap, UploadCloud, LockKeyhole, LineChart];
              const Icon = icons[index] ?? DatabaseZap;
              return (
                <div key={title} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-700 text-white">
                <Activity className="h-4 w-4" />
              </span>
              RiskLens
            </div>
            <p className="text-xs text-slate-500">
              Informational portfolio recordkeeping and risk visibility only. Not financial, investment, or legal advice.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-slate-600">
            <a href="#capabilities" className="hover:text-slate-950">
              Capabilities
            </a>
            <a href="#workflow" className="hover:text-slate-950">
              Workflow
            </a>
            <Link href="/login" className="hover:text-slate-950">
              Sign in
            </Link>
            <Link href="/register" className="text-emerald-700 hover:underline">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
