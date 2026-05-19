"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";
import type { Notification } from "@/types/notification";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiRequest<Notification[]>("/notifications?limit=100")
  });
  const markRead = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/notifications/${id}/read`, {
        method: "PUT"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification marked read");
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Realtime feed</p>
        <h1 className="text-3xl font-semibold">Notifications</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(notificationsQuery.data ?? []).map((item) => (
            <div key={item._id} className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.title}</p>
                  <Badge variant={item.isRead ? "secondary" : item.severity === "HIGH" ? "destructive" : item.severity === "MEDIUM" ? "warning" : "success"}>
                    {item.isRead ? "Read" : item.severity}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
              </div>
              {!item.isRead ? (
                <Button variant="outline" size="sm" onClick={() => markRead.mutate(item._id)}>
                  <CheckCircle2 className="h-4 w-4" />
                  Mark read
                </Button>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
