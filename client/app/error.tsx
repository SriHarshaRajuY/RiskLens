"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md space-y-5 rounded-xl border bg-card p-6 text-center shadow-soft">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">RiskLens</p>
          <h1 className="mt-2 text-xl font-semibold">We couldn&apos;t load this page</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Something unexpected happened. Please try again or return to the home page.
          </p>
        </div>
        <div className="flex justify-center gap-2.5">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
