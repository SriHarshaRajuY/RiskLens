"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, UploadCloud } from "lucide-react";
import { WorkspaceHeader } from "@/components/dashboard/WorkspaceHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useActivePortfolio } from "@/hooks/useActivePortfolio";
import { apiRequest } from "@/lib/api";
import type { Portfolio } from "@/types/portfolio";
import type { UploadJob, UploadJobStatus } from "@/types/upload";

function statusVariant(status: UploadJobStatus): "success" | "warning" | "destructive" | "secondary" | "default" {
  if (status === "COMPLETED") return "success";
  if (status === "PROCESSING" || status === "QUEUED") return "warning";
  if (status === "FAILED") return "destructive";
  if (status === "PARTIAL_FAILURE") return "default";
  return "secondary";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value?: string): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function ImportsPage() {
  const portfoliosQuery = useQuery({
    queryKey: ["portfolios"],
    queryFn: () => apiRequest<Portfolio[]>("/portfolios?limit=20")
  });
  const portfolios = portfoliosQuery.data ?? [];
  const {
    activePortfolio,
    activePortfolioId,
    setActivePortfolioId
  } = useActivePortfolio(portfolios);
  const uploadsQuery = useQuery({
    queryKey: ["uploads", activePortfolioId],
    queryFn: () => apiRequest<UploadJob[]>(`/uploads?limit=50&sortBy=createdAt&sortOrder=desc&portfolioId=${activePortfolioId}`),
    enabled: Boolean(activePortfolioId),
    refetchInterval: 5000
  });

  if (portfoliosQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import history unavailable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">RiskLens could not load your portfolio workspaces for import history.</p>
          <Button onClick={() => portfoliosQuery.refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (!portfoliosQuery.isLoading && portfolios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No portfolio selected</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Create a portfolio before uploading trade history.</p>
          <Button asChild>
            <Link href="/dashboard/portfolios">Create portfolio</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="CSV operations"
        title="Import history"
        description={activePortfolio ? `${activePortfolio.name} CSV import history.` : "CSV import history."}
        portfolios={portfolios}
        activePortfolioId={activePortfolioId}
        onPortfolioChange={setActivePortfolioId}
        openHref={activePortfolioId ? `/dashboard/portfolios/${activePortfolioId}` : undefined}
        openLabel="Open details"
        actions={
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => uploadsQuery.refetch()} disabled={uploadsQuery.isFetching || !activePortfolioId}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Upload jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {uploadsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading import history...</p> : null}
          {uploadsQuery.isError ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Import history could not be loaded. Confirm the backend is running and retry.
            </div>
          ) : null}
          {!uploadsQuery.isLoading && !uploadsQuery.isError && (uploadsQuery.data ?? []).length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <UploadCloud className="h-5 w-5" />
              </div>
              No CSV imports yet.
            </div>
          ) : null}
          {(uploadsQuery.data ?? []).length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Rows</TableHead>
                    <TableHead className="text-right">Imported</TableHead>
                    <TableHead className="text-right">Rejected</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(uploadsQuery.data ?? []).map((job) => (
                    <TableRow key={job._id}>
                      <TableCell className="min-w-52 font-medium">{job.originalFileName}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(job.status)}>{job.status.replaceAll("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{job.totalRows}</TableCell>
                      <TableCell className="text-right">{job.validRows}</TableCell>
                      <TableCell className="text-right">{job.invalidRows}</TableCell>
                      <TableCell className="text-right">{formatFileSize(job.fileSize)}</TableCell>
                      <TableCell className="min-w-44 text-muted-foreground">{formatDate(job.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
