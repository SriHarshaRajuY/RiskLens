"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, jsonBody } from "@/lib/api";
import type { Portfolio } from "@/types/portfolio";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  baseCurrency: z.enum(["USD", "INR"])
});

type Values = z.infer<typeof schema>;

export default function PortfoliosPage() {
  const queryClient = useQueryClient();
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
    onSuccess: () => {
      form.reset({ name: "", description: "", baseCurrency: "USD" });
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      toast.success("Portfolio created");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create portfolio")
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Create portfolio</CardTitle>
          <CardDescription>Each portfolio has isolated trades, alerts, snapshots, and analytics cache keys.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...form.register("name")} placeholder="Tech Stocks Portfolio" aria-invalid={Boolean(form.formState.errors.name)} />
              {form.formState.errors.name ? <p className="text-sm text-destructive">{form.formState.errors.name.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...form.register("description")} placeholder="Long-term holdings and risk alerts" aria-invalid={Boolean(form.formState.errors.description)} />
              {form.formState.errors.description ? <p className="text-sm text-destructive">{form.formState.errors.description.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...form.register("baseCurrency")}>
                <option value="USD">USD</option>
                <option value="INR">INR</option>
              </select>
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold">Portfolios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Workspace-level portfolio entities and ownership boundaries.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {(portfoliosQuery.data ?? []).map((portfolio) => (
            <Card key={portfolio._id}>
              <CardHeader>
                <CardTitle>{portfolio.name}</CardTitle>
                <CardDescription>{portfolio.description || "No description"}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{portfolio.baseCurrency}</span>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/portfolios/${portfolio._id}`}>
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
          {portfoliosQuery.isLoading ? <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading portfolios...</CardContent></Card> : null}
          {!portfoliosQuery.isLoading && (portfoliosQuery.data ?? []).length === 0 ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Create your first portfolio to start tracking risk.</CardContent></Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
