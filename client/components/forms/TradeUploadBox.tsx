"use client";

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api";
import { useUploadProgress } from "@/hooks/useUploadProgress";

export function TradeUploadBox({ portfolioId }: { portfolioId: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const progress = useUploadProgress(portfolioId);
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return apiRequest(`/portfolios/${portfolioId}/trades/upload`, {
        method: "POST",
        rawBody: body
      });
    },
    onSuccess: () => {
      toast.success("CSV upload queued");
      queryClient.invalidateQueries({ queryKey: ["uploads"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Upload failed")
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>CSV upload</CardTitle>
        <CardDescription>Expected columns: date, symbol, side, quantity, price, fees.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input ref={inputRef} type="file" accept=".csv,text/csv" />
        <Button
          onClick={() => {
            const file = inputRef.current?.files?.[0];
            if (!file) {
              toast.error("Select a CSV file first");
              return;
            }
            mutation.mutate(file);
          }}
          disabled={mutation.isPending}
        >
          <Upload className="h-4 w-4" />
          Upload trades
        </Button>
        {progress ? (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.status}</span>
              <span>{progress.progress}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress.progress}%` }} />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
