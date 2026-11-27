import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { Holding } from "@/types/analytics";

export function HoldingsTable({ holdings, currency = "USD" }: { holdings: Holding[]; currency?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Holdings</CardTitle>
        <CardDescription>Open positions, average cost basis, and current allocation weight</CardDescription>
      </CardHeader>
      <CardContent>
        {holdings.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Add trades or upload a CSV to generate holdings.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Avg cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">P&amp;L</TableHead>
                  <TableHead className="text-right">Alloc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((holding) => (
                  <TableRow key={holding.symbol}>
                    <TableCell>
                      <Badge variant="secondary" className="font-semibold">{holding.symbol}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{holding.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(holding.averageBuyPrice, currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <div>{formatCurrency(holding.currentPrice, currency)}</div>
                      {holding.priceSource === "fallback" ? <div className="text-[11px] text-muted-foreground">Estimated</div> : null}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(holding.marketValue, currency)}</TableCell>
                    <TableCell className={`text-right font-medium tabular-nums ${holding.totalPnl >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {formatCurrency(holding.totalPnl, currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{holding.allocationPercent.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
