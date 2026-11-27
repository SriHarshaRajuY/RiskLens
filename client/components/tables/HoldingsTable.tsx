import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { Holding, MarketPriceSource } from "@/types/analytics";

function priceSourceBadge(source?: MarketPriceSource) {
  if (source === "last_trade") {
    return (
      <span
        title="Live market quote unavailable right now; valued using your last recorded trade price"
        className="mt-0.5 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
      >
        Last trade
      </span>
    );
  }
  if (source === "fallback") {
    return (
      <span
        title="Estimated reference price"
        className="mt-0.5 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
      >
        Estimated
      </span>
    );
  }
  return null;
}

export function HoldingsTable({ holdings, currency = "USD" }: { holdings: Holding[]; currency?: string }) {
  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const totalUnrealized = holdings.reduce((sum, h) => sum + h.unrealizedPnl, 0);
  const totalRealized = holdings.reduce((sum, h) => sum + h.realizedPnl, 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Holdings</CardTitle>
            <CardDescription>Open positions, average cost basis, market valuation, and P&amp;L breakdown</CardDescription>
          </div>
          {holdings.length > 0 ? (
            <Badge variant="secondary" className="tabular-nums">
              {holdings.length} {holdings.length === 1 ? "position" : "positions"}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-0">
        {holdings.length === 0 ? (
          <div className="p-6">
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              Add trades or upload a CSV to generate open holdings.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="pl-5">Symbol</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Avg cost</TableHead>
                  <TableHead className="text-right">Market price</TableHead>
                  <TableHead className="text-right">Market value</TableHead>
                  <TableHead className="text-right">Unrealized P&amp;L</TableHead>
                  <TableHead className="text-right">Realized P&amp;L</TableHead>
                  <TableHead className="pr-5 text-right">Weight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((holding) => {
                  const unrealizedPct = holding.costBasis > 0 ? (holding.unrealizedPnl / holding.costBasis) * 100 : 0;
                  return (
                    <TableRow key={holding.symbol}>
                      <TableCell className="pl-5">
                        <Badge variant="secondary" className="font-semibold tracking-wide">
                          {holding.symbol}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{holding.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatCurrency(holding.averageBuyPrice, currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className="font-medium text-foreground">{formatCurrency(holding.currentPrice, currency)}</div>
                        {priceSourceBadge(holding.priceSource)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(holding.marketValue, currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className={`font-semibold ${holding.unrealizedPnl >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                          {holding.unrealizedPnl > 0 ? "+" : ""}
                          {formatCurrency(holding.unrealizedPnl, currency)}
                        </div>
                        <div className={`text-[11px] ${unrealizedPct >= 0 ? "text-emerald-700/80" : "text-red-700/80"}`}>
                          {unrealizedPct >= 0 ? "+" : ""}
                          {unrealizedPct.toFixed(1)}%
                        </div>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium tabular-nums ${
                          holding.realizedPnl > 0
                            ? "text-emerald-700"
                            : holding.realizedPnl < 0
                              ? "text-red-700"
                              : "text-muted-foreground"
                        }`}
                      >
                        {holding.realizedPnl > 0 ? "+" : ""}
                        {formatCurrency(holding.realizedPnl, currency)}
                      </TableCell>
                      <TableCell className="pr-5 text-right tabular-nums">
                        <div className="ml-auto flex w-20 flex-col items-end gap-1">
                          <span className="font-medium">{holding.allocationPercent.toFixed(1)}%</span>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(Math.max(holding.allocationPercent, 2), 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/25 font-semibold hover:bg-muted/25">
                  <TableCell colSpan={4} className="pl-5 text-xs uppercase tracking-wider text-muted-foreground">
                    Open Portfolio Totals
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(totalValue, currency)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${totalUnrealized >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {totalUnrealized > 0 ? "+" : ""}
                    {formatCurrency(totalUnrealized, currency)}
                  </TableCell>
                  <TableCell className={`text-right tabular-nums ${totalRealized >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {totalRealized > 0 ? "+" : ""}
                    {formatCurrency(totalRealized, currency)}
                  </TableCell>
                  <TableCell className="pr-5 text-right tabular-nums">100.0%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
