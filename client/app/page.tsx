import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BellRing,
  FileText,
  LineChart,
  LockKeyhole,
  ShieldCheck,
  UploadCloud,
  Zap
} from "lucide-react";
import { InteractivePreview } from "@/components/landing/InteractivePreview";
import { Button } from "@/components/ui/button";

const capabilities = [
  {
    title: "Spreadsheet & manual tracking",
    description: "Upload trade CSV files or enter individual trades with automatic checks and clear row-by-row feedback.",
    icon: UploadCloud
  },
  {
    title: "Holdings & P&L analytics",
    description: "View open positions, allocation weights, realized and unrealized P&L, and daily portfolio performance.",
    icon: LineChart
  },
  {
    title: "Custom risk alerts",
    description: "Set personal thresholds for daily loss, max drawdown, single-stock concentration, and volatility.",
    icon: BellRing
  },
  {
    title: "Plain-English risk summary",
    description: "Read clear, factual explanations of what your risk score means and which holdings drove each alert.",
    icon: FileText
  }
];

const workflow = [
  ["Create your portfolio", "Set up a dedicated USD or INR workspace for your trades, alerts, and performance history."],
  ["Add or upload trades", "Import a trade spreadsheet or log trades one by one with built-in quantity checks."],
  ["Review risk & alerts", "See your risk score, concentration breakdown, and plain-English explanations of any threshold breach."],
  ["Test simple strategies", "Compare historical buy-and-hold and moving-average results without placing real orders."]
];

const platform = [
  ["Factual, non-advisory clarity", "Risk summaries explain your own numbers and historical trades clearly—never pushy buy or sell tips."],
  ["Smooth background imports", "Upload large trade spreadsheets without waiting; your workspace stays fast while records import."],
  ["Instant live updates", "See upload progress, triggered risk alerts, and activity updates appear automatically—no refresh needed."],
  ["Always-on reliability", "Built-in safeguards keep your portfolio analytics and risk summaries available at all times."]
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f5f7f2] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f5f7f2]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-sm font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm">
              <Activity className="h-5 w-5" />
            </span>
            <span className="text-base tracking-tight">RiskLens</span>
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-slate-200/80 bg-white/75 p-1 text-sm font-medium text-slate-600 shadow-sm md:flex" aria-label="Primary navigation">
            <a href="#capabilities" className="rounded-full px-3.5 py-1.5 transition-colors hover:bg-slate-100 hover:text-slate-950">
              Features
            </a>
            <a href="#workflow" className="rounded-full px-3.5 py-1.5 transition-colors hover:bg-slate-100 hover:text-slate-950">
              How it works
            </a>
            <a href="#platform" className="rounded-full px-3.5 py-1.5 transition-colors hover:bg-slate-100 hover:text-slate-950">
              Trust &amp; reliability
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-slate-700 hover:bg-white/80 hover:text-slate-950">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_12%_18%,rgba(16,185,129,0.15),transparent_32%),linear-gradient(135deg,#f5f7f2_0%,#eef5ed_48%,#f8fafc_100%)]">
        <div className="absolute inset-0 dashboard-grid opacity-65" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
          <div className="max-w-xl animate-page-enter">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              Personal portfolio &amp; risk workspace
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Clear portfolio risk, zero guesswork.
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-700 sm:text-lg">
              Import your trades, track real holdings and profit/loss, get alerted when risk limits are crossed, and read plain-English explanations of every number.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/register">
                  Create free workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full border-slate-300 bg-white/90 sm:w-auto">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-3 text-xs font-medium text-slate-700 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3 shadow-sm">
                <p className="font-semibold text-slate-950">CSV &amp; Manual</p>
                <p className="mt-0.5 text-slate-500">Clean trade records</p>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3 shadow-sm">
                <p className="font-semibold text-slate-950">Live Alerts</p>
                <p className="mt-0.5 text-slate-500">Instant breach notices</p>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white/85 px-4 py-3 shadow-sm">
                <p className="font-semibold text-slate-950">Smart Summaries</p>
                <p className="mt-0.5 text-slate-500">Plain-English insights</p>
              </div>
            </div>
          </div>

          <div className="animate-page-enter">
            <InteractivePreview />
          </div>
        </div>
      </section>

      <section id="capabilities" className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Features</p>
            <h2 className="mt-2.5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Everything needed for disciplined portfolio review
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              RiskLens brings your trade history, risk metrics, threshold alerts, and clear metric explanations into one calm workspace.
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
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">How it works</p>
            <h2 className="mt-2.5 text-3xl font-semibold tracking-tight text-slate-950">From raw trades to complete clarity</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Built around a simple review habit: organize your trades, understand your exposure, watch key thresholds, and save clean reports.
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
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Trust &amp; reliability</p>
              <h2 className="mt-2.5 text-3xl font-semibold tracking-tight text-slate-950">Built for everyday clarity and peace of mind</h2>
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
              const icons = [ShieldCheck, UploadCloud, Zap, LockKeyhole];
              const Icon = icons[index] ?? ShieldCheck;
              return (
                <div key={title} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
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

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
            <div className="space-y-3">
              <Link href="/" className="inline-flex items-center gap-2.5 text-sm font-semibold text-slate-950">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm">
                  <Activity className="h-4 w-4" />
                </span>
                <span className="text-base tracking-tight">RiskLens</span>
              </Link>
              <p className="max-w-sm text-xs leading-5 text-slate-600">
                A calm portfolio tracking and risk-visibility workspace for reviewing holdings, monitoring alert limits, and exporting factual summaries.
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <p className="font-semibold uppercase tracking-wider text-slate-900">Product</p>
              <ul className="space-y-2 text-slate-600">
                <li>
                  <a href="#capabilities" className="transition-colors hover:text-slate-950">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#workflow" className="transition-colors hover:text-slate-950">
                    How it works
                  </a>
                </li>
                <li>
                  <a href="#platform" className="transition-colors hover:text-slate-950">
                    Trust &amp; reliability
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5 text-xs">
              <p className="font-semibold uppercase tracking-wider text-slate-900">Workspace</p>
              <ul className="space-y-2 text-slate-600">
                <li>
                  <Link href="/login" className="transition-colors hover:text-slate-950">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="font-medium text-emerald-700 transition-colors hover:text-emerald-800 hover:underline">
                    Create free account
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-slate-100 pt-6 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>Informational portfolio recordkeeping and risk visibility only. Not financial, investment, or legal advice.</p>
            <p>© {new Date().getFullYear()} RiskLens</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
