export type QueueCounts = {
  waiting?: number;
  active?: number;
  completed?: number;
  failed?: number;
  delayed?: number;
};

export type AdminMetrics = {
  api: {
    sampleSize: number;
    averageLatencyMs: number;
    p95LatencyMs: number;
    minLatencyMs: number;
    maxLatencyMs: number;
  };
  counters: {
    apiFailures: number;
    authFailures: number;
    failedUploads: number;
    cacheHits: number;
    cacheMisses: number;
    notificationsCreated: number;
    websocketConnections: number;
  };
  cache: {
    hitRatio: number;
  };
  queues: Record<string, QueueCounts>;
  domain: {
    activeAlerts: number;
    unreadNotifications: number;
    failedUploads: number;
  };
};
