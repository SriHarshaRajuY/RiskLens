import Link from "next/link";
import { Activity, ArrowRight, BellRing, DatabaseZap, Layers3, LineChart, LockKeyhole, RadioTower, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const capabilities = [
  {
    title: "Trade ingestion",
    description: "Manual trade entry and async CSV processing with validation, row summaries, and worker progress.",
    icon: UploadCloud
  },
  {
    title: "Risk analytics",
    description: "Holdings, realized P&L, unrealized P&L, volatility, Sharpe ratio, drawdown, and VaR.",
    icon: LineChart
  },
  {
    title: "Alert workflow",
    description: "Portfolio thresholds, alert status, notifications, and activity are kept in one workspace.",
    icon: BellRing
  }
];

const platformHighlights = [
  ["Secure access", "Protected workspaces with secure session handling and request validation"],
  ["Portfolio records", "Organized portfolios, trades, holdings, activity, and alerts in one workspace"],
  ["Async imports", "CSV uploads are processed in the background with progress updates"],
  ["Live updates", "Realtime notifications keep uploads, alerts, and activity in sync"],
  ["Risk visibility", "Clear risk metrics help users understand exposure without trading-bot complexity"]
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-400 text-slate-950">
              <Activity className="h-4 w-4" />
            </span>
            RiskLens
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex" aria-label="Landing navigation">
            <a href="#features" className="transition-colors hover:text-white">
              Features
            </a>
            <a href="#architecture" className="transition-colors hover:text-white">
              Architecture
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-slate-200 hover:bg-white/10 hover:text-white">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="bg-teal-400 text-slate-950 hover:bg-teal-300">
              <Link href="/register">Create account</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 dashboard-grid opacity-25" />
        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <Badge className="mb-6 bg-white/10 text-teal-100">Portfolio analytics platform</Badge>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-normal md:text-7xl">RiskLens</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              A focused portfolio analytics workspace for tracking trades, monitoring risk, uploading CSV history,
              receiving alerts, and understanding portfolio performance from one clean dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="default" className="bg-teal-400 text-slate-950 hover:bg-teal-300">
                <Link href="/register">
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-2xl">
            <div className="rounded-md border border-white/10 bg-slate-950 p-5">
              <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Dashboard preview</p>
                  <p className="mt-1 text-xs text-slate-400">Portfolio analytics workspace</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="rounded-md bg-emerald-400/15 px-2 py-1 text-emerald-200">Low risk</span>
                  <span className="rounded-md bg-amber-400/15 px-2 py-1 text-amber-200">Alerts on</span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["Value", "$42.8k"],
                  ["Total P&L", "+$3.4k"],
                  ["VaR 95", "2.8%"]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="mt-2 text-xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-md border border-white/10 bg-white/[0.04] p-4">
                <div className="flex h-44 items-end gap-2" aria-hidden="true">
                  {[38, 44, 42, 58, 54, 68, 62, 76, 74, 88, 82, 94].map((height, index) => (
                    <div key={index} className="flex-1 rounded-t bg-teal-300/80" style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {[
                  ["AAPL", "42.4%", "+$1,240"],
                  ["MSFT", "31.8%", "+$880"]
                ].map(([symbol, allocation, pnl]) => (
                  <div key={symbol} className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm">
                    <div>
                      <p className="font-semibold">{symbol}</p>
                      <p className="text-xs text-slate-400">{allocation} allocation</p>
                    </div>
                    <p className="text-emerald-200">{pnl}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-white/10 bg-slate-900/40 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-teal-200">Product capabilities</p>
            <h2 className="mt-3 text-3xl font-semibold">Built around real portfolio workflows</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
                  <Icon className="h-5 w-5 text-teal-300" />
                  <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="architecture" className="px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[360px_1fr]">
          <div>
            <p className="text-sm font-medium text-teal-200">Platform workflow</p>
            <h2 className="mt-3 text-3xl font-semibold">Built for clear portfolio decisions</h2>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              RiskLens connects portfolio setup, trade ingestion, analytics, risk alerts, notifications, and activity
              history so users can move from raw trades to actionable portfolio context.
            </p>
          </div>
          <div className="grid gap-3">
            {platformHighlights.map(([title, description], index) => {
              const icons = [DatabaseZap, Layers3, RadioTower, LockKeyhole, LineChart];
              const Icon = icons[index] ?? DatabaseZap;
              return (
                <div key={title} className="flex gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal-400/10 text-teal-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1 text-sm text-slate-300">{description}</p>
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
