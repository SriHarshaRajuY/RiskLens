"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, jsonBody } from "@/lib/api";
import type { RiskAlert } from "@/types/alert";

type AlertValues = {
  type: RiskAlert["type"];
  threshold: number;
};

export function AlertsPanel({ portfolioId }: { portfolioId: string }) {
  const queryClient = useQueryClient();
  const form = useForm<AlertValues>({
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
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create alert")
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form className="grid gap-3 sm:grid-cols-[1fr_120px_auto]" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
          <div className="space-y-2">
            <Label>Type</Label>
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("type")}>
              <option value="DAILY_LOSS">Daily loss</option>
              <option value="MAX_DRAWDOWN">Max drawdown</option>
              <option value="CONCENTRATION">Concentration</option>
              <option value="VOLATILITY">Volatility</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Threshold %</Label>
            <Input type="number" step="0.1" {...form.register("threshold", { valueAsNumber: true })} />
          </div>
          <Button className="self-end" disabled={createMutation.isPending}>Create</Button>
        </form>
        <div className="space-y-3">
          {(alertsQuery.data ?? []).map((alert) => (
            <div key={alert._id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{alert.type.replaceAll("_", " ")}</p>
                <p className="text-xs text-muted-foreground">{alert.threshold}% threshold</p>
              </div>
              <Badge variant={alert.isActive ? "success" : "secondary"}>{alert.isActive ? "Active" : "Paused"}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
