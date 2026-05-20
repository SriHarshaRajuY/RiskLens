"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md space-y-5 text-center">
        <div>
          <p className="text-sm font-medium text-primary">RiskLens</p>
          <h1 className="mt-2 text-2xl font-semibold">We could not render this workspace.</h1>
          <p className="mt-2 text-sm text-muted-foreground">Retry the request or return to the landing page.</p>
        </div>
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>Retry</Button>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
