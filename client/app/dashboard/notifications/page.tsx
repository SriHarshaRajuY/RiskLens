"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { WorkspaceHeader } from "@/components/dashboard/WorkspaceHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { apiRequest, getApiErrorMessage } from "@/lib/api";
import type { Notification } from "@/types/notification";
import type { Portfolio } from "@/types/portfolio";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<"portfolio" | "all">("portfolio");
  const portfoliosQuery = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => apiRequest<Portfolio[]>("/portfolios?limit=20")
  });
  const portfolios = portfoliosQuery.data ?? [];
  const {
    activePortfolio,
    activePortfolioId,
    setActivePortfolioId
  } = useActivePortfolio(portfolios);
  const isPortfolioScoped = scope === "portfolio" && Boolean(activePortfolioId);
  useEffect(() => {
    if (!activePortfolioId && scope === "portfolio") {
      setScope("all");
    }
  }, [activePortfolioId, scope]);
  const notificationsQuery = useQuery({
    queryKey: ["notifications", scope, activePortfolioId],
    queryFn: () =>
      apiRequest<Notification[]>(isPortfolioScoped ? `/notifications?limit=100&portfolioId=${activePortfolioId}` : "/notifications?limit=100")
  });
  const markRead = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/notifications/${id}/read`, {
        method: "PUT"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification marked read");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not update notification"));
    }
  });

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Realtime feed"
        title="Notifications"
        description={
          isPortfolioScoped && activePortfolio
            ? `${activePortfolio.name} alerts, import updates, and activity.`
            : "Account-wide alerts, import updates, and activity."
        }
        portfolios={portfolios}
        activePortfolioId={activePortfolioId}
        onPortfolioChange={setActivePortfolioId}
        openHref={activePortfolioId ? `/dashboard/portfolios/${activePortfolioId}` : undefined}
        openLabel="Open details"
        actions={
          <div className="grid w-full grid-cols-2 rounded-md border bg-background p-1 sm:w-auto">
            <Button
              type="button"
              size="sm"
              variant={isPortfolioScoped ? "default" : "ghost"}
              className="h-8"
              disabled={!activePortfolioId}
              onClick={() => setScope("portfolio")}
            >
              Selected
            </Button>
            <Button type="button" size="sm" variant={scope === "all" ? "default" : "ghost"} className="h-8" onClick={() => setScope("all")}>
              All
            </Button>
          </div>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>{isPortfolioScoped && activePortfolio ? `${activePortfolio.name} inbox` : "Account inbox"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificationsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading notifications...</p> : null}
          {notificationsQuery.isError ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Notifications could not be loaded. Please retry from the sidebar.
            </div>
          ) : null}
          {!notificationsQuery.isLoading && !notificationsQuery.isError && (notificationsQuery.data ?? []).length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : null}
          {(notificationsQuery.data ?? []).map((item) => (
            <div key={item._id} className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.title}</p>
                  <Badge variant={item.isRead ? "secondary" : item.severity === "HIGH" ? "destructive" : item.severity === "MEDIUM" ? "warning" : "success"}>
                    {item.isRead ? "Read" : item.severity}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
              </div>
              {!item.isRead ? (
                <Button variant="outline" size="sm" onClick={() => markRead.mutate(item._id)}>
                  <CheckCircle2 className="h-4 w-4" />
                  Mark read
                </Button>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}


