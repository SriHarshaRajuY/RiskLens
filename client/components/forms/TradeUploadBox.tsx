"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, Loader2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest, getApiErrorMessage } from "@/lib/api";
import { useUploadProgress } from "@/hooks/useUploadProgress";

type UploadStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "PARTIAL_FAILURE";

type UploadJob = {
  _id: string;
  originalFileName: string;
  status: UploadStatus;
  totalRows: number;
  processedRows: number;
  validRows: number;
  invalidRows: number;
  rowErrors?: Array<{ row: number; code: string; message: string }>;
};

const terminalStatuses = new Set<UploadStatus>(["COMPLETED", "FAILED", "PARTIAL_FAILURE"]);

function statusCopy(status: UploadStatus): string {
  const labels: Record<UploadStatus, string> = {
    QUEUED: "Queued",
    PROCESSING: "Processing",
    COMPLETED: "Completed",
    FAILED: "Failed",
    PARTIAL_FAILURE: "Partially imported"
  };
  return labels[status];
}

export function TradeUploadBox({ portfolioId }: { portfolioId: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [uploadJobId, setUploadJobId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const progress = useUploadProgress(portfolioId);
  const uploadJobQuery = useQuery({
    queryKey: ["upload-job", uploadJobId],
    queryFn: () => apiRequest<UploadJob>(`/uploads/${uploadJobId}`),
    enabled: Boolean(uploadJobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && terminalStatuses.has(status) ? false : 1500;
    }
  });
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return apiRequest<UploadJob>(`/portfolios/${portfolioId}/trades/upload`, {
        method: "POST",
        rawBody: body,
        timeoutMs: 30_000
      });
    },
    onSuccess: (job) => {
      setUploadJobId(job._id);
      toast.success("CSV upload queued for processing");
      queryClient.invalidateQueries({ queryKey: ["uploads"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Upload failed"))
  });

  const displayStatus = progress?.status ?? uploadJobQuery.data?.status;
  const progressPercent = progress?.progress ?? (displayStatus === "COMPLETED" ? 100 : displayStatus === "PROCESSING" ? 50 : displayStatus === "QUEUED" ? 5 : 0);
  const currentJob = uploadJobQuery.data;
  const firstRowError = currentJob?.rowErrors?.[0];
  const statusTone = displayStatus === "FAILED" ? "text-red-700" : displayStatus === "PARTIAL_FAILURE" ? "text-amber-700" : "text-muted-foreground";
  const statusIcon = useMemo(() => {
    if (displayStatus === "COMPLETED") return <CheckCircle2 className="h-4 w-4 text-emerald-700" />;
    if (displayStatus === "FAILED") return <XCircle className="h-4 w-4 text-red-700" />;
    if (displayStatus === "PARTIAL_FAILURE") return <XCircle className="h-4 w-4 text-amber-700" />;
    if (displayStatus) return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  }, [displayStatus]);

  useEffect(() => {
    const status = displayStatus;
    if (!status || !terminalStatuses.has(status)) return;
    queryClient.invalidateQueries({ queryKey: ["summary", portfolioId] });
    queryClient.invalidateQueries({ queryKey: ["holdings", portfolioId] });
    queryClient.invalidateQueries({ queryKey: ["risk", portfolioId] });
    queryClient.invalidateQueries({ queryKey: ["returns", portfolioId] });
    queryClient.invalidateQueries({ queryKey: ["trades", portfolioId] });
    queryClient.invalidateQueries({ queryKey: ["activity", portfolioId] });
    queryClient.invalidateQueries({ queryKey: ["uploads"] });
  }, [displayStatus, portfolioId, queryClient]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>CSV upload</CardTitle>
        <CardDescription>Upload trade history with columns: date, symbol, side, quantity, price, fees.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? "")}
        />
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span className="truncate">{selectedFileName || "No CSV selected"}</span>
        </div>
        <Button
          onClick={() => {
            const file = inputRef.current?.files?.[0];
            if (!file) {
              toast.error("Select a CSV file first");
              return;
            }
            if (!file.name.toLowerCase().endsWith(".csv")) {
              toast.error("Select a .csv file with the required trade columns");
              return;
            }
            mutation.mutate(file);
          }}
          disabled={mutation.isPending}
        >
          <Upload className="h-4 w-4" />
          {mutation.isPending ? "Queueing upload..." : "Upload trades"}
        </Button>

        {displayStatus ? (
          <div className="rounded-md border p-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                {statusIcon}
                <span className={statusTone}>{statusCopy(displayStatus)}</span>
              </div>
              <span className="text-muted-foreground">{Math.min(Math.max(progressPercent, 0), 100)}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }} />
            </div>
            {currentJob ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {currentJob.validRows} imported, {currentJob.invalidRows} rejected
                {currentJob.totalRows ? ` from ${currentJob.totalRows} rows` : ""}.
              </p>
            ) : null}
            {firstRowError ? (
              <p className="mt-2 text-xs text-red-700">
                {firstRowError.row > 0 ? `Row ${firstRowError.row}: ` : ""}
                {firstRowError.message}
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
