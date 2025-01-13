import Redis from "ioredis";
import { getGlobalLogger } from "./logger";

const logger = getGlobalLogger();

const redisClient = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
  offlineQueue: false,
});

redisClient.on("ready", () => {
  logger.info("redis connection is ready");
});

redisClient.on("error", (err) => {
  logger.info(`an error occurred connecting to redis ${err.message}`);
});

export default redisClient