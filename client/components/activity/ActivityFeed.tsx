import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityLog } from "@/types/activity";

function cleanMessage(message: string): string {
  return message
    .replaceAll("(deterministic-fallback)", "using Built-in Assistant")
    .replaceAll("(deterministic)", "using Built-in Risk Engine")
    .replaceAll("(gemini)", "via Gemini AI");
}

export function ActivityFeed({ items }: { items: ActivityLog[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>Recent ledger updates, risk checks, and assistant activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">No activity yet.</div>
          ) : null}
          {items.map((item) => (
            <div key={item._id} className="border-l-2 border-primary/35 pl-3.5">
              <p className="text-sm font-medium text-foreground">{cleanMessage(item.message)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.type.replaceAll("_", " ")} · {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
