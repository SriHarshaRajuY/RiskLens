import Link from "next/link";
import { ArrowRight, BellRing, DatabaseZap, Layers3, LineChart, RadioTower } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative flex min-h-screen items-center overflow-hidden">
        <div className="absolute inset-0 dashboard-grid opacity-30" />
        <div className="absolute right-0 top-16 hidden w-[56rem] rotate-[-4deg] rounded-lg border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur md:block">
          <div className="rounded-md bg-slate-950 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="h-3 w-28 rounded bg-teal-300" />
                <div className="mt-3 h-2 w-48 rounded bg-white/20" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-8 w-24 rounded bg-emerald-400/20" />
                <div className="h-8 w-24 rounded bg-amber-400/20" />
                <div className="h-8 w-24 rounded bg-rose-400/20" />
              </div>
            </div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-8 rounded-md border border-white/10 bg-white/[0.04] p-4">
                <div className="flex h-56 items-end gap-2">
                  {[38, 44, 42, 58, 54, 68, 62, 76, 74, 88, 82, 94].map((height, index) => (
                    <div key={index} className="flex-1 rounded-t bg-teal-300/80" style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>
              <div className="col-span-4 space-y-4">
                <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
                  <div className="h-3 w-24 rounded bg-white/50" />
                  <div className="mt-5 h-20 rounded-full border-[18px] border-teal-300 border-r-amber-300 border-t-rose-300" />
                </div>
                <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
                  <div className="h-3 w-28 rounded bg-white/50" />
                  <div className="mt-4 space-y-2">
                    <div className="h-2 rounded bg-rose-300/80" />
                    <div className="h-2 w-4/5 rounded bg-amber-300/80" />
                    <div className="h-2 w-2/3 rounded bg-teal-300/80" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20">
          <Badge className="mb-6 bg-white/10 text-teal-100">Full-stack fintech analytics</Badge>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-normal md:text-7xl">RiskLens</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Portfolio analytics, risk alerts, async CSV ingestion, Redis-backed caching, worker orchestration, realtime
            notifications, and production-minded observability in one TypeScript SaaS platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="default" className="bg-teal-400 text-slate-950 hover:bg-teal-300">
              <Link href="/login">
                Open dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
              <Link href="/register">Create workspace</Link>
            </Button>
          </div>
          <div className="mt-16 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["APIs", DatabaseZap],
              ["Queues", Layers3],
              ["Risk", LineChart],
              ["Alerts", BellRing],
              ["Realtime", RadioTower]
            ].map(([label, Icon]) => (
              <div key={String(label)} className="rounded-md border border-white/10 bg-white/[0.04] p-4">
                <Icon className="h-5 w-5 text-teal-300" />
                <p className="mt-3 text-sm font-medium">{String(label)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
