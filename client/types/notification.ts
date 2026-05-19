export type Notification = {
  _id: string;
  portfolioId?: string;
  alertId?: string;
  title: string;
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
};
