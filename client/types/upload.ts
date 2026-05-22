export type UploadJobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "PARTIAL_FAILURE";

export type UploadRowError = {
  row: number;
  code: string;
  message: string;
};

export type UploadJob = {
  _id: string;
  userId: string;
  portfolioId: string;
  originalFileName: string;
  fileSize: number;
  checksum?: string;
  status: UploadJobStatus;
  totalRows: number;
  processedRows: number;
  validRows: number;
  invalidRows: number;
  rowErrors: UploadRowError[];
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  queueJobId?: string;
  requestId?: string;
  createdAt: string;
  updatedAt: string;
};
