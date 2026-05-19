export type ActivityLog = {
  _id: string;
  portfolioId?: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};
