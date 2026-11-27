import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md space-y-5 rounded-xl border bg-card p-6 text-center shadow-soft">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Compass className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Page not found</p>
          <h1 className="mt-2 text-xl font-semibold">We couldn&apos;t find that page</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The link may be outdated or moved. Head back to your portfolio overview.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard">Go to overview</Link>
        </Button>
      </div>
    </main>
  );
}
