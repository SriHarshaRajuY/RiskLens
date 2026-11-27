"use client";

import { useId } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, getApiErrorMessage, jsonBody } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const schema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1, "Symbol is required")
    .max(12, "Symbol must be 12 characters or fewer")
    .regex(/^[A-Za-z][A-Za-z0-9.-]*$/, "Use a valid market symbol, for example AAPL")
    .transform((value) => value.toUpperCase()),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  price: z.coerce.number().positive("Price must be greater than zero"),
  fees: z.coerce.number().min(0, "Fees cannot be negative").default(0),
  tradeDate: z.string().min(1, "Trade date is required")
});

type Values = z.infer<typeof schema>;

export function TradeForm({ portfolioId, currency = "USD" }: { portfolioId: string; currency?: string }) {
  const idPrefix = useId();
  const queryClient = useQueryClient();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      symbol: "",
      side: "BUY",
      fees: 0,
      tradeDate: new Date().toISOString().slice(0, 10)
    }
  });

  const watchedQty = Number(form.watch("quantity") || 0);
  const watchedPrice = Number(form.watch("price") || 0);
  const watchedFees = Number(form.watch("fees") || 0);
  const estimatedNotional =
    Number.isFinite(watchedQty) && Number.isFinite(watchedPrice) && watchedQty > 0 && watchedPrice > 0
      ? watchedQty * watchedPrice + (Number.isFinite(watchedFees) ? watchedFees : 0)
      : null;

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      apiRequest(`/portfolios/${portfolioId}/trades`, {
        method: "POST",
        body: jsonBody({ ...values, tradeDate: new Date(values.tradeDate).toISOString() })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary", portfolioId] });
      queryClient.invalidateQueries({ queryKey: ["holdings", portfolioId] });
      queryClient.invalidateQueries({ queryKey: ["risk", portfolioId] });
      queryClient.invalidateQueries({ queryKey: ["risk-narrative", portfolioId] });
      queryClient.invalidateQueries({ queryKey: ["returns", portfolioId] });
      queryClient.invalidateQueries({ queryKey: ["trades", portfolioId] });
      queryClient.invalidateQueries({ queryKey: ["activity", portfolioId] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      form.reset({
        symbol: "",
        side: "BUY",
        quantity: undefined,
        price: undefined,
        fees: 0,
        tradeDate: new Date().toISOString().slice(0, 10)
      });
      toast.success("Trade recorded");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not add trade"))
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record manual trade</CardTitle>
        <CardDescription>Log a buy or sell execution directly into this portfolio ledger.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-symbol`}>Symbol</Label>
            <Input
              id={`${idPrefix}-symbol`}
              {...form.register("symbol")}
              placeholder="MSFT"
              className="uppercase"
              aria-invalid={Boolean(form.formState.errors.symbol)}
            />
            {form.formState.errors.symbol ? <p className="text-xs text-destructive">{form.formState.errors.symbol.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-side`}>Side</Label>
            <select
              id={`${idPrefix}-side`}
              className="h-10 w-full rounded-lg border bg-background px-3.5 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
              {...form.register("side")}
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-qty`}>Quantity</Label>
            <Input
              id={`${idPrefix}-qty`}
              type="number"
              step="0.0001"
              placeholder="10"
              {...form.register("quantity")}
              aria-invalid={Boolean(form.formState.errors.quantity)}
            />
            {form.formState.errors.quantity ? <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-price`}>Price per unit ({currency})</Label>
            <Input
              id={`${idPrefix}-price`}
              type="number"
              step="0.01"
              placeholder="420.00"
              {...form.register("price")}
              aria-invalid={Boolean(form.formState.errors.price)}
            />
            {form.formState.errors.price ? <p className="text-xs text-destructive">{form.formState.errors.price.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-fees`}>Fees ({currency})</Label>
            <Input id={`${idPrefix}-fees`} type="number" step="0.01" {...form.register("fees")} aria-invalid={Boolean(form.formState.errors.fees)} />
            {form.formState.errors.fees ? <p className="text-xs text-destructive">{form.formState.errors.fees.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-date`}>Execution date</Label>
            <Input id={`${idPrefix}-date`} type="date" {...form.register("tradeDate")} aria-invalid={Boolean(form.formState.errors.tradeDate)} />
            {form.formState.errors.tradeDate ? <p className="text-xs text-destructive">{form.formState.errors.tradeDate.message}</p> : null}
          </div>

          {estimatedNotional !== null ? (
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3.5 py-2 text-xs text-muted-foreground sm:col-span-2">
              <span>Order notional (incl. fees)</span>
              <span className="font-semibold tabular-nums text-foreground">{formatCurrency(estimatedNotional, currency)}</span>
            </div>
          ) : null}

          <Button type="submit" className="w-full sm:col-span-2" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {mutation.isPending ? "Recording trade..." : "Add trade"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
