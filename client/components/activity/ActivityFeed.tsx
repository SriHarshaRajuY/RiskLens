import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityLog } from "@/types/activity";

export function ActivityFeed({ items }: { items: ActivityLog[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : null}
          {items.map((item) => (
            <div key={item._id} className="border-l-2 border-primary/30 pl-3">
              <p className="text-sm font-medium">{item.message}</p>
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
