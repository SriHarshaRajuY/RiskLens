"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AdminMetrics, QueueCounts } from "@/types/admin";

function queueHealth(counts: QueueCounts): "success" | "warning" | "destructive" {
  if ((counts.failed ?? 0) > 0) return "destructive";
  if ((counts.waiting ?? 0) > 0 || (counts.delayed ?? 0) > 0 || (counts.active ?? 0) > 0) return "warning";
  return "success";
}

export default function OperationsPage() {
  const { user } = useAuth();
  const metricsQuery = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => apiRequest<AdminMetrics>("/admin/metrics"),
    enabled: user?.role === "ADMIN",
    refetchInterval: 10000
  });

  if (user?.role !== "ADMIN") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workspace health</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This page is available to workspace administrators.
          </p>
        </CardContent>
      </Card>
    );
  }

  const metrics = metricsQuery.data;
  const queues = Object.entries(metrics?.queues ?? {});

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Workspace health</p>
          <h1 className="text-3xl font-semibold">Operations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review service health, import activity, alerts, uploads, and notifications.</p>
        </div>
        <Button className="w-full sm:w-auto" variant="outline" onClick={() => metricsQuery.refetch()} disabled={metricsQuery.isFetching}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {metricsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading operations metrics...</p> : null}
      {metricsQuery.isError ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">Workspace health could not be loaded. Please refresh and try again.</CardContent>
        </Card>
      ) : null}

      {metrics ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Average latency" value={`${metrics.api.averageLatencyMs.toFixed(2)} ms`} detail={`${metrics.api.sampleSize} samples`} />
            <MetricCard title="p95 latency" value={`${metrics.api.p95LatencyMs.toFixed(2)} ms`} />
            <MetricCard title="Cache hit ratio" value={`${(metrics.cache.hitRatio * 100).toFixed(1)}%`} />
            <MetricCard title="Failed uploads" value={String(metrics.domain.failedUploads)} tone={metrics.domain.failedUploads > 0 ? "bad" : "good"} />
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <MetricCard title="Active alerts" value={String(metrics.domain.activeAlerts)} />
            <MetricCard title="Unread notifications" value={String(metrics.domain.unreadNotifications)} />
            <MetricCard title="Websocket connections" value={String(metrics.counters.websocketConnections)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Import queue health</CardTitle>
            </CardHeader>
            <CardContent>
              {queues.length === 0 ? <p className="text-sm text-muted-foreground">No queue metrics available yet.</p> : null}
              {queues.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Queue</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Waiting</TableHead>
                        <TableHead className="text-right">Active</TableHead>
                        <TableHead className="text-right">Completed</TableHead>
                        <TableHead className="text-right">Failed</TableHead>
                        <TableHead className="text-right">Delayed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queues.map(([name, counts]) => (
                        <TableRow key={name}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell>
                            <Badge variant={queueHealth(counts)}>{queueHealth(counts) === "success" ? "Healthy" : "Needs review"}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{counts.waiting ?? 0}</TableCell>
                          <TableCell className="text-right">{counts.active ?? 0}</TableCell>
                          <TableCell className="text-right">{counts.completed ?? 0}</TableCell>
                          <TableCell className="text-right">{counts.failed ?? 0}</TableCell>
                          <TableCell className="text-right">{counts.delayed ?? 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
