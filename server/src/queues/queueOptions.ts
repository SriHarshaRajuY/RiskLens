import type { JobsOptions } from "bullmq";
import { createRedisConnection } from "../config/redis.js";

export const queueConnection = createRedisConnection("risklens-bullmq");

export const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 3000
  },
  removeOnComplete: {
    age: 60 * 60 * 24,
    count: 1000
  },
  removeOnFail: {
    age: 60 * 60 * 24 * 7,
    count: 1000
  }
};
