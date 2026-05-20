"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";
import type { Portfolio } from "@/types/portfolio";

export default function AlertsPage() {
  const portfoliosQuery = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => apiRequest<Portfolio[]>("/portfolios?limit=20")
  });
  const portfolio = portfoliosQuery.data?.[0];

  if (portfoliosQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Checking your portfolios...</p>
        </CardContent>
      </Card>
    );
  }

  if (!portfolio) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No portfolio selected</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/portfolios">Create portfolio</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Alert center</p>
        <h1 className="text-3xl font-semibold">{portfolio.name}</h1>
      </div>
      <AlertsPanel portfolioId={portfolio._id} />
    </div>
  );
}
