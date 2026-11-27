"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, FileSpreadsheet, FileText, Loader2, Upload, UploadCloud, X, XCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, getApiErrorMessage } from "@/lib/api";
import { useUploadProgress } from "@/hooks/useUploadProgress";
import { cn } from "@/lib/utils";

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TradeUploadBox({ portfolioId }: { portfolioId: string }) {
  const fileInputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadJobId, setUploadJobId] = useState<string | null>(null);
  const [queuedDelayVisible, setQueuedDelayVisible] = useState(false);
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
      setQueuedDelayVisible(false);
      toast.success("Spreadsheet uploaded — importing trades now");
      queryClient.invalidateQueries({ queryKey: ["uploads"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Upload failed"))
  });

  const displayStatus = progress?.status ?? uploadJobQuery.data?.status;
  const progressPercent = progress?.progress ?? (displayStatus === "COMPLETED" ? 100 : displayStatus === "PROCESSING" ? 50 : displayStatus === "QUEUED" ? 5 : 0);
  const currentJob = uploadJobQuery.data;
  const rowErrors = currentJob?.rowErrors ?? [];
  const statusTone = displayStatus === "FAILED" ? "text-red-700" : displayStatus === "PARTIAL_FAILURE" ? "text-amber-700" : "text-muted-foreground";
  const statusIcon = useMemo(() => {
    if (displayStatus === "COMPLETED") return <CheckCircle2 className="h-4 w-4 text-emerald-700" />;
    if (displayStatus === "FAILED") return <XCircle className="h-4 w-4 text-red-700" />;
    if (displayStatus === "PARTIAL_FAILURE") return <XCircle className="h-4 w-4 text-amber-700" />;
    if (displayStatus) return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  }, [displayStatus]);

  useEffect(() => {
    if (displayStatus !== "QUEUED") {
      setQueuedDelayVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setQueuedDelayVisible(true), 20_000);
    return () => window.clearTimeout(timer);
  }, [displayStatus, uploadJobId]);

  useEffect(() => {
    const status = displayStatus;
    if (!status || !terminalStatuses.has(status)) return;
    queryClient.invalidateQueries({ queryKey: ["summary", portfolioId] });
    queryClient.invalidateQueries({ queryKey: ["holdings", portfolioId] });
    queryClient.invalidateQueries({ queryKey: ["risk", portfolioId] });
    queryClient.invalidateQueries({ queryKey: ["risk-narrative", portfolioId] });
    queryClient.invalidateQueries({ queryKey: ["returns", portfolioId] });
    queryClient.invalidateQueries({ queryKey: ["trades", portfolioId] });
    queryClient.invalidateQueries({ queryKey: ["activity", portfolioId] });
    queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    queryClient.invalidateQueries({ queryKey: ["uploads"] });
  }, [displayStatus, portfolioId, queryClient]);

  function handleSelectFile(file: File | null): void {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Select a .csv file with the required trade columns");
      return;
    }
    setSelectedFile(file);
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Import trades via CSV</CardTitle>
        <CardDescription>
          Required columns: <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">date, symbol, side, quantity, price, fees</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between space-y-4">
        <div className="space-y-4">
          <input
            id={fileInputId}
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => handleSelectFile(event.target.files?.[0] ?? null)}
          />

          {selectedFile ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)} · Ready to upload</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove selected file"
                onClick={() => {
                  setSelectedFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label
              htmlFor={fileInputId}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                handleSelectFile(event.dataTransfer.files?.[0] ?? null);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-7 text-center transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/35"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UploadCloud className="h-5 w-5" />
              </div>
              <p className="mt-2.5 text-sm font-medium text-foreground">Click to browse or drop your CSV file here</p>
              <p className="mt-1 text-xs text-muted-foreground">UTF-8 CSV up to 5 MB · Duplicate rows automatically skipped</p>
            </label>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => {
                if (!selectedFile) {
                  toast.error("Select a CSV file first");
                  return;
                }
                mutation.mutate(selectedFile);
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {mutation.isPending ? "Uploading..." : "Upload trades"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                const sampleCsv = [
                  "date,symbol,side,quantity,price,fees",
                  "2026-10-01,AAPL,BUY,10,225.50,1.00",
                  "2026-10-12,MSFT,BUY,5,418.00,1.00",
                  "2026-10-20,AAPL,SELL,2,232.00,1.00"
                ].join("\n");
                const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "sample-trades.csv";
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4" />
              Sample CSV
            </Button>
          </div>
        </div>

        {displayStatus ? (
          <div className="rounded-lg border bg-muted/20 p-3.5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                {statusIcon}
                <span className={cn("font-medium", statusTone)}>{statusCopy(displayStatus)}</span>
              </div>
              <span className="font-mono text-muted-foreground">{Math.min(Math.max(progressPercent, 0), 100)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }} />
            </div>
            {currentJob ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {currentJob.validRows} imported, {currentJob.invalidRows} rejected
                {currentJob.totalRows ? ` from ${currentJob.totalRows} rows` : ""}.
              </p>
            ) : null}
            {queuedDelayVisible ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                This upload is taking longer than usual. You can keep this page open or check import history for the latest status.
              </div>
            ) : null}
            {rowErrors.length > 0 ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <p className="font-semibold">Row errors</p>
                <ul className="mt-2 space-y-1">
                  {rowErrors.slice(0, 8).map((error, index) => (
                    <li key={`${error.row}-${error.code}-${index}`}>
                      {error.row > 0 ? `Row ${error.row}: ` : ""}{error.message}
                    </li>
                  ))}
                </ul>
                {rowErrors.length > 8 ? <p className="mt-2 text-red-700">Showing 8 of {rowErrors.length} errors. Open import history for the full status.</p> : null}
              </div>
            ) : null}
            {uploadJobId ? (
              <Button asChild variant="link" className="mt-2 h-auto p-0 text-xs">
                <Link href="/dashboard/imports">View import history</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
