import { Queue } from "bullmq";
import redisClient from "../../shared/redis-client";

export const ReconcilePaymentQueue = new Queue(
  "reoncile-payment-queue",
  {
    connection: redisClient,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: {
        age: 1000 * 60 * 60 * 24, // 24 hours
        count: 20,
      },
    },
  }
);