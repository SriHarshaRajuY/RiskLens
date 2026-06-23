"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { clearActivePortfolioId, persistActivePortfolioId } from "@/hooks/useActivePortfolio";
import { apiRequest, getApiErrorMessage, jsonBody } from "@/lib/api";
import { mongoId } from "@/lib/mongo";
import type { Portfolio } from "@/types/portfolio";

const schema = z.object({
  name: z.string().trim().min(2, "Portfolio name must be at least 2 characters").max(100, "Portfolio name must be under 100 characters"),
  description: z.string().trim().max(500, "Description must be under 500 characters").optional(),
  baseCurrency: z.enum(["USD", "INR"])
});

type Values = z.infer<typeof schema>;

type EditingPortfolio = Values & { id: string };

export default function PortfoliosPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EditingPortfolio | null>(null);
  const portfoliosQuery = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => apiRequest<Portfolio[]>("/portfolios?limit=50")
  });
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      baseCurrency: "USD"
    }
  });
  const createMutation = useMutation({
    mutationFn: (values: Values) =>
      apiRequest<Portfolio>("/portfolios", {
        method: "POST",
        body: jsonBody(values)
      }),
    onSuccess: (portfolio) => {
      const portfolioId = mongoId(portfolio._id);
      if (portfolioId) {
        persistActivePortfolioId(portfolioId);
      }
      form.reset({ name: "", description: "", baseCurrency: "USD" });
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      toast.success("Portfolio created");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not create portfolio"))
  });
  const updateMutation = useMutation({
    mutationFn: (values: EditingPortfolio) =>
      apiRequest<Portfolio>(`/portfolios/${values.id}`, {
        method: "PUT",
        body: jsonBody({
          name: values.name,
          description: values.description,
          baseCurrency: values.baseCurrency
        })
      }),
    onSuccess: (portfolio) => {
      const portfolioId = mongoId(portfolio._id);
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      if (portfolioId) {
        queryClient.invalidateQueries({ queryKey: ["portfolio", portfolioId] });
        queryClient.invalidateQueries({ queryKey: ["activity", portfolioId] });
      }
      setEditing(null);
      toast.success("Portfolio updated");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not update portfolio"))
  });
  const deleteMutation = useMutation({
    mutationFn: (portfolioId: string) =>
      apiRequest(`/portfolios/${portfolioId}`, {
        method: "DELETE"
      }),
    onSuccess: (_data, portfolioId) => {
      clearActivePortfolioId(portfolioId);
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast.success("Portfolio deleted");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not delete portfolio"))
  });

  function beginEdit(portfolio: Portfolio): void {
    const portfolioId = mongoId(portfolio._id);
    if (!portfolioId) return;
    setEditing({
      id: portfolioId,
      name: portfolio.name,
      description: portfolio.description ?? "",
      baseCurrency: portfolio.baseCurrency
    });
  }

  function saveEdit(): void {
    if (!editing) return;
    const parsed = schema.safeParse(editing);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Fix portfolio details before saving");
      return;
    }
    updateMutation.mutate({ ...parsed.data, id: editing.id });
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)] xl:gap-8">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Create portfolio</CardTitle>
          <CardDescription>Create a workspace for trades, holdings, alerts, and analytics.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
            <div className="space-y-2.5">
              <Label>Name</Label>
              <Input {...form.register("name")} placeholder="Long-Term Portfolio" aria-invalid={Boolean(form.formState.errors.name)} />
              {form.formState.errors.name ? <p className="text-sm text-destructive">{form.formState.errors.name.message}</p> : null}
            </div>
            <div className="space-y-2.5">
              <Label>Description</Label>
              <Textarea {...form.register("description")} placeholder="Core holdings, CSV imports, and risk alerts" aria-invalid={Boolean(form.formState.errors.description)} />
              {form.formState.errors.description ? <p className="text-sm text-destructive">{form.formState.errors.description.message}</p> : null}
            </div>
            <div className="space-y-2.5">
              <Label>Currency</Label>
              <select className="h-11 w-full rounded-md border bg-background px-3.5 text-sm outline-none transition focus:ring-2 focus:ring-ring" {...form.register("baseCurrency")}>
                <option value="USD">USD</option>
                <option value="INR">INR</option>
              </select>
            </div>
            <Button type="submit" className="w-full sm:w-auto" disabled={createMutation.isPending}>
              <Plus className="h-4 w-4" />
              Create portfolio
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="min-w-0 space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">Portfolios</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Manage portfolios and open detailed analytics workspaces.</p>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {(portfoliosQuery.data ?? []).map((portfolio) => {
            const portfolioId = mongoId(portfolio._id);
            const isEditing = Boolean(portfolioId && editing?.id === portfolioId);
            return (
              <Card key={portfolioId || portfolio.name} className="flex min-h-48 flex-col">
                <CardHeader className="pb-3">
                  {isEditing && editing ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={editing.description ?? ""} onChange={(event) => setEditing({ ...editing, description: event.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <select
                          className="h-11 w-full rounded-md border bg-background px-3.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                          value={editing.baseCurrency}
                          onChange={(event) => setEditing({ ...editing, baseCurrency: event.target.value as Values["baseCurrency"] })}
                        >
                          <option value="USD">USD</option>
                          <option value="INR">INR</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <>
                      <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                      <CardDescription className="max-w-xl">{portfolio.description || "No description"}</CardDescription>
                    </>
                  )}
                </CardHeader>
                <CardContent className="mt-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{portfolio.baseCurrency}</span>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    {portfolioId ? (
                      isEditing ? (
                        <>
                          <Button size="sm" className="w-full sm:w-auto" disabled={updateMutation.isPending} onClick={saveEdit}>
                            <Check className="h-4 w-4" />
                            Save
                          </Button>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setEditing(null)}>
                            <X className="h-4 w-4" />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                            <Link href={`/dashboard/portfolios/${portfolioId}`}>
                              Open
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => beginEdit(portfolio)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                          <ConfirmAction
                            title="Delete portfolio?"
                            description={portfolio.name}
                            confirmLabel="Delete"
                            variant="destructive"
                            disabled={deleteMutation.isPending}
                            onConfirm={() => deleteMutation.mutate(portfolioId)}
                            trigger={(open) => (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-muted-foreground hover:text-destructive sm:w-auto"
                                disabled={deleteMutation.isPending}
                                onClick={open}
                                aria-label={`Delete ${portfolio.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            )}
                          />
                        </>
                      )
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        Unavailable
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {portfoliosQuery.isLoading ? <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading portfolios...</CardContent></Card> : null}
          {!portfoliosQuery.isLoading && (portfoliosQuery.data ?? []).length === 0 ? (
            <Card>
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-sm font-medium">No portfolios yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create your first portfolio to start adding trades, uploading CSV history, and tracking analytics.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
