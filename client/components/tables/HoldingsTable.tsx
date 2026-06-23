import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { Holding } from "@/types/analytics";

export function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Holdings</CardTitle>
      </CardHeader>
      <CardContent>
        {holdings.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
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
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead className="text-right">Alloc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((holding) => (
                  <TableRow key={holding.symbol}>
                    <TableCell>
                      <Badge variant="secondary">{holding.symbol}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{holding.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(holding.averageBuyPrice)}</TableCell>
                    <TableCell className="text-right">
                      <div>{formatCurrency(holding.currentPrice)}</div>
                      {holding.priceSource === "fallback" ? <div className="text-xs text-muted-foreground">Fallback</div> : null}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(holding.marketValue)}</TableCell>
                    <TableCell className={holding.totalPnl >= 0 ? "text-right text-emerald-700" : "text-right text-red-700"}>
                      {formatCurrency(holding.totalPnl)}
                    </TableCell>
                    <TableCell className="text-right">{holding.allocationPercent.toFixed(1)}%</TableCell>
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
