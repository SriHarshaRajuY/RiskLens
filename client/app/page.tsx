import Link from "next/link";
import { Activity, ArrowRight, BarChart3, BellRing, DatabaseZap, LineChart, LockKeyhole, ShieldCheck, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

const capabilities = [
  {
    title: "Trade history intake",
    description: "Import CSV trades or add records manually, then review validation status and import history.",
    icon: UploadCloud
  },
  {
    title: "Portfolio analytics",
    description: "Track holdings, allocation, realized P&L, unrealized P&L, returns, and risk metrics.",
    icon: LineChart
  },
  {
    title: "Risk monitoring",
    description: "Create portfolio thresholds for drawdown, concentration, volatility, and daily loss events.",
    icon: BellRing
  }
];

const workflow = [
  ["Create portfolio", "Set up a dedicated workspace for trades, alerts, activity, and analytics."],
  ["Import trades", "Upload CSV history or add trades manually, with clear checks before records are saved."],
  ["Review analytics", "Monitor portfolio value, allocation, risk score, and alert-driven notifications."],
  ["Evaluate strategy", "Run simple backtests from historical price data without order execution."]
];

const platform = [
  ["Reliable workspace", "Portfolio data, alerts, imports, and activity stay organized in one secure place."],
  ["Background imports", "Large CSV uploads can be processed while you continue reviewing the portfolio."],
  ["Live progress", "Upload progress, notifications, and activity updates appear without needing to hunt for them."],
  ["Fast review", "Portfolio summaries and risk views are designed to load quickly during repeated review."]
];

function PreviewPanel() {
  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-[-7rem] mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_30px_90px_rgba(15,23,42,0.16)] backdrop-blur sm:bottom-[-8rem] sm:p-4 lg:right-8 lg:left-auto lg:w-[58rem]">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">Portfolio workspace</p>
            <p className="mt-1 text-xs text-slate-500">Holdings, risk, alerts, imports, and activity</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-700">Risk monitored</span>
            <span className="rounded-md bg-sky-50 px-2.5 py-1 text-sky-700">CSV ready</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {["Portfolio value", "Total P&L", "Risk score", "Unread alerts"].map((label) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
              <div className="mt-3 h-6 rounded bg-slate-100" />
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Portfolio value</p>
              <BarChart3 className="h-4 w-4 text-emerald-700" />
            </div>
            <div className="flex h-40 items-end gap-2" aria-hidden="true">
              {[42, 48, 46, 58, 55, 67, 63, 72, 70, 78, 74, 82].map((height, index) => (
                <div key={index} className="flex-1 rounded-t bg-emerald-600/70" style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            {["Holdings", "Risk alerts", "Import activity"].map((label) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-2 rounded bg-slate-100" />
                  <div className="h-2 w-2/3 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f5f7f2] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f5f7f2]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm">
              <Activity className="h-5 w-5" />
            </span>
            RiskLens
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex" aria-label="Primary navigation">
            <a href="#capabilities" className="transition-colors hover:text-slate-950">Capabilities</a>
            <a href="#workflow" className="transition-colors hover:text-slate-950">Workflow</a>
            <a href="#platform" className="transition-colors hover:text-slate-950">Platform</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Create account</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative min-h-[88svh] overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.16),transparent_28%),linear-gradient(135deg,#f5f7f2_0%,#eef5ed_48%,#f8fafc_100%)]">
        <div className="absolute inset-0 dashboard-grid opacity-70" />
        <div className="relative mx-auto flex min-h-[88svh] max-w-7xl items-start px-4 pb-48 pt-16 sm:px-6 sm:pb-56 sm:pt-20 lg:px-8 lg:pb-48">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              Portfolio risk workspace
            </div>
            <h1 className="mt-7 text-5xl font-semibold tracking-normal text-slate-950 sm:text-6xl lg:text-7xl">
              RiskLens
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700">
              Import trades, understand portfolio exposure, monitor risk thresholds, and review portfolio activity from one focused analytics workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="w-full sm:w-auto">
                <Link href="/register">
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full border-slate-300 bg-white/80 sm:w-auto">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-1 gap-3 text-sm text-slate-700 sm:grid-cols-3">
              {["CSV imports", "Risk alerts", "Live updates"].map((item) => (
                <div key={item} className="rounded-lg border border-slate-200 bg-white/75 px-4 py-3 shadow-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
        <PreviewPanel />
      </section>

      <section id="capabilities" className="px-4 pb-16 pt-36 sm:px-6 sm:pt-44 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-emerald-700">Capabilities</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">Everything needed for portfolio review</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">RiskLens keeps trade records, analytics, alerting, and activity in one consistent workflow.</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
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

      <section id="workflow" className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Workflow</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">From raw trades to risk context</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">The app is designed around a practical review cycle: collect records, calculate analytics, monitor thresholds, and inspect changes.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {workflow.map(([title, description], index) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-[#f8faf7] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Step {index + 1}</p>
                <h3 className="mt-3 text-base font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="platform" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Platform</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">Built for day-to-day portfolio review</h2>
            </div>
            <Button asChild variant="outline" className="w-full bg-white sm:w-auto">
              <Link href="/register">Open workspace</Link>
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
    </main>
  );
}