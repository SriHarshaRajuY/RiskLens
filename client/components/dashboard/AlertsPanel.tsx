"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pause, Pencil, Play, Trash2, X } from "lucide-react";
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

type EditingAlert = AlertValues & {
  id: string;
  isActive: boolean;
};

const alertSchema = z.object({
  type: z.enum(["DAILY_LOSS", "MAX_DRAWDOWN", "CONCENTRATION", "VOLATILITY"]),
  threshold: z.coerce.number().positive("Threshold must be greater than zero").max(100, "Threshold cannot exceed 100")
});

function alertLabel(type: RiskAlert["type"]): string {
  return type.replaceAll("_", " ");
}

export function AlertsPanel({ portfolioId }: { portfolioId: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EditingAlert | null>(null);
  const form = {
    type: "CONCENTRATION" as RiskAlert["type"],
    threshold: 40
  };
  const [draft, setDraft] = useState<AlertValues>(form);

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
      queryClient.invalidateQueries({ queryKey: ["activity", portfolioId] });
      setDraft(form);
      toast.success("Alert created");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not create alert"))
  });
  const updateMutation = useMutation({
    mutationFn: (values: EditingAlert) =>
      apiRequest<RiskAlert>(`/alerts/${values.id}`, {
        method: "PUT",
        body: jsonBody({ type: values.type, threshold: values.threshold, isActive: values.isActive })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts", portfolioId] });
      queryClient.invalidateQueries({ queryKey: ["activity", portfolioId] });
      setEditing(null);
      toast.success("Alert updated");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not update alert"))
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

  function createAlert(): void {
    const parsed = alertSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Fix alert details before saving");
      return;
    }
    createMutation.mutate(parsed.data);
  }

  function saveAlert(): void {
    if (!editing) return;
    const parsed = alertSchema.safeParse(editing);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Fix alert details before saving");
      return;
    }
    updateMutation.mutate({ ...editing, ...parsed.data });
  }

  function toggleAlert(alert: RiskAlert): void {
    updateMutation.mutate({
      id: alert._id,
      type: alert.type,
      threshold: alert.threshold,
      isActive: !alert.isActive
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_140px_auto]">
          <div className="space-y-2.5">
            <Label>Type</Label>
            <select
              className="h-11 w-full rounded-md border bg-background px-3.5 text-sm font-medium outline-none transition focus:ring-2 focus:ring-ring"
              value={draft.type}
              onChange={(event) => setDraft({ ...draft, type: event.target.value as RiskAlert["type"] })}
            >
              <option value="DAILY_LOSS">Daily loss</option>
              <option value="MAX_DRAWDOWN">Max drawdown</option>
              <option value="CONCENTRATION">Concentration</option>
              <option value="VOLATILITY">Volatility</option>
            </select>
          </div>
          <div className="space-y-2.5">
            <Label>Threshold %</Label>
            <Input type="number" step="0.1" value={draft.threshold} onChange={(event) => setDraft({ ...draft, threshold: Number(event.target.value) })} />
          </div>
          <Button type="button" className="self-end" disabled={createMutation.isPending} onClick={createAlert}>
            Create alert
          </Button>
        </div>
        <div className="space-y-3">
          {alertsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading alerts...</p> : null}
          {alertsQuery.isError ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Alerts could not be loaded. Retry after confirming the API is available.
            </div>
          ) : null}
          {!alertsQuery.isLoading && !alertsQuery.isError && (alertsQuery.data ?? []).length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No alerts configured for this portfolio.
            </div>
          ) : null}
          {(alertsQuery.data ?? []).map((alert) => {
            const isEditing = editing?.id === alert._id;
            return (
              <div key={alert._id} className="flex flex-col gap-3 rounded-md border p-3 lg:flex-row lg:items-center lg:justify-between">
                {isEditing && editing ? (
                  <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm font-medium outline-none transition focus:ring-2 focus:ring-ring"
                      value={editing.type}
                      onChange={(event) => setEditing({ ...editing, type: event.target.value as RiskAlert["type"] })}
                    >
                      <option value="DAILY_LOSS">Daily loss</option>
                      <option value="MAX_DRAWDOWN">Max drawdown</option>
                      <option value="CONCENTRATION">Concentration</option>
                      <option value="VOLATILITY">Volatility</option>
                    </select>
                    <Input type="number" step="0.1" value={editing.threshold} onChange={(event) => setEditing({ ...editing, threshold: Number(event.target.value) })} />
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium">{alertLabel(alert.type)}</p>
                    <p className="text-xs text-muted-foreground">{alert.threshold}% threshold</p>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Badge variant={alert.isActive ? "success" : "secondary"}>{alert.isActive ? "Active" : "Paused"}</Badge>
                  {isEditing ? (
                    <>
                      <Button size="sm" disabled={updateMutation.isPending} onClick={saveAlert}>
                        <Check className="h-4 w-4" />
                        Save
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" disabled={updateMutation.isPending} onClick={() => toggleAlert(alert)}>
                        {alert.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {alert.isActive ? "Pause" : "Resume"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing({ id: alert._id, type: alert.type, threshold: alert.threshold, isActive: alert.isActive })}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <ConfirmAction
                        title="Delete alert?"
                        description={`${alertLabel(alert.type)} at ${alert.threshold}%`}
                        confirmLabel="Delete"
                        variant="destructive"
                        disabled={deleteMutation.isPending}
                        onConfirm={() => deleteMutation.mutate(alert._id)}
                        trigger={(open) => (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-destructive"
                            aria-label={`Delete ${alertLabel(alert.type).toLowerCase()} alert`}
                            disabled={deleteMutation.isPending}
                            onClick={open}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
