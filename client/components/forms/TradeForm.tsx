"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, getApiErrorMessage, jsonBody } from "@/lib/api";

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

export function TradeForm({ portfolioId }: { portfolioId: string }) {
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
      queryClient.invalidateQueries({ queryKey: ["returns", portfolioId] });
      queryClient.invalidateQueries({ queryKey: ["trades", portfolioId] });
      queryClient.invalidateQueries({ queryKey: ["activity", portfolioId] });
      form.reset({
        symbol: "",
        side: "BUY",
        quantity: undefined,
        price: undefined,
        fees: 0,
        tradeDate: new Date().toISOString().slice(0, 10)
      });
      toast.success("Trade added");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not add trade"))
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add trade</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className="space-y-2.5">
            <Label>Symbol</Label>
            <Input {...form.register("symbol")} placeholder="AAPL" aria-invalid={Boolean(form.formState.errors.symbol)} />
            {form.formState.errors.symbol ? <p className="text-sm text-destructive">{form.formState.errors.symbol.message}</p> : null}
          </div>
          <div className="space-y-2.5">
            <Label>Side</Label>
            <select className="h-11 w-full rounded-md border bg-background px-3.5 text-sm font-medium outline-none transition focus:ring-2 focus:ring-ring" {...form.register("side")}>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
          <div className="space-y-2.5">
            <Label>Quantity</Label>
            <Input type="number" step="0.0001" placeholder="10" {...form.register("quantity")} aria-invalid={Boolean(form.formState.errors.quantity)} />
            {form.formState.errors.quantity ? <p className="text-sm text-destructive">{form.formState.errors.quantity.message}</p> : null}
          </div>
          <div className="space-y-2.5">
            <Label>Price</Label>
            <Input type="number" step="0.01" placeholder="180.00" {...form.register("price")} aria-invalid={Boolean(form.formState.errors.price)} />
            {form.formState.errors.price ? <p className="text-sm text-destructive">{form.formState.errors.price.message}</p> : null}
          </div>
          <div className="space-y-2.5">
            <Label>Fees</Label>
            <Input type="number" step="0.01" {...form.register("fees")} aria-invalid={Boolean(form.formState.errors.fees)} />
            {form.formState.errors.fees ? <p className="text-sm text-destructive">{form.formState.errors.fees.message}</p> : null}
          </div>
          <div className="space-y-2.5">
            <Label>Date</Label>
            <Input type="date" {...form.register("tradeDate")} aria-invalid={Boolean(form.formState.errors.tradeDate)} />
            {form.formState.errors.tradeDate ? <p className="text-sm text-destructive">{form.formState.errors.tradeDate.message}</p> : null}
          </div>
          <Button type="submit" className="w-full sm:col-span-2" disabled={mutation.isPending}>
            <Plus className="h-4 w-4" />
            Add trade
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
