"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, getApiErrorMessage, jsonBody } from "@/lib/api";
import type { RiskAlert } from "@/types/alert";

type AlertValues = {
  type: RiskAlert["type"];
  threshold: number;
};

const alertSchema = z.object({
  type: z.enum(["DAILY_LOSS", "MAX_DRAWDOWN", "CONCENTRATION", "VOLATILITY"]),
  threshold: z.coerce.number().positive("Threshold must be greater than zero").max(100, "Threshold cannot exceed 100")
});

export function AlertsPanel({ portfolioId }: { portfolioId: string }) {
  const queryClient = useQueryClient();
  const form = useForm<AlertValues>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      type: "CONCENTRATION",
      threshold: 40
    }
  });
  const alertsQuery = useQuery({
    queryKey: ["alerts", portfolioId],
    queryFn: () => apiRequest<RiskAlert[]>(`/portfolios/${portfolioId}/alerts`)
  });
  const createMutation = useMutation({
    mutationFn: (values: AlertValues) =>
      apiRequest<RiskAlert>(`/portfolios/${portfolioId}/alerts`, {
        method: "POST",
        body: jsonBody({ ...values, isActive: true })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts", portfolioId] });
      toast.success("Alert created");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not create alert"))
  });
  const deleteMutation = useMutation({
    mutationFn: (alertId: string) =>
      apiRequest(`/alerts/${alertId}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts", portfolioId] });
      queryClient.invalidateQueries({ queryKey: ["activity", portfolioId] });
      toast.success("Alert deleted");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not delete alert"))
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form className="grid gap-4 lg:grid-cols-[1fr_140px_auto]" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
          <div className="space-y-2.5">
            <Label>Type</Label>
            <select className="h-11 w-full rounded-md border bg-background px-3.5 text-sm font-medium outline-none transition focus:ring-2 focus:ring-ring" {...form.register("type")}>
              <option value="DAILY_LOSS">Daily loss</option>
              <option value="MAX_DRAWDOWN">Max drawdown</option>
              <option value="CONCENTRATION">Concentration</option>
              <option value="VOLATILITY">Volatility</option>
            </select>
          </div>
          <div className="space-y-2.5">
            <Label>Threshold %</Label>
            <Input type="number" step="0.1" {...form.register("threshold", { valueAsNumber: true })} aria-invalid={Boolean(form.formState.errors.threshold)} />
            {form.formState.errors.threshold ? <p className="text-sm text-destructive">{form.formState.errors.threshold.message}</p> : null}
          </div>
          <Button type="submit" className="self-end" disabled={createMutation.isPending}>
            Create alert
          </Button>
        </form>
        <div className="space-y-3">
          {alertsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading alerts...</p> : null}
          {!alertsQuery.isLoading && (alertsQuery.data ?? []).length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No alerts configured for this portfolio.
            </div>
          ) : null}
          {(alertsQuery.data ?? []).map((alert) => (
            <div key={alert._id} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">{alert.type.replaceAll("_", " ")}</p>
                <p className="text-xs text-muted-foreground">{alert.threshold}% threshold</p>
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <Badge variant={alert.isActive ? "success" : "secondary"}>{alert.isActive ? "Active" : "Paused"}</Badge>
                <ConfirmAction
                  title="Delete alert?"
                  description={`${alert.type.replaceAll("_", " ")} at ${alert.threshold}%`}
                  confirmLabel="Delete"
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onConfirm={() => deleteMutation.mutate(alert._id)}
                  trigger={(open) => (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${alert.type.replaceAll("_", " ").toLowerCase()} alert`}
                      disabled={deleteMutation.isPending}
                      onClick={open}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
