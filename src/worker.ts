import "reflect-metadata";
import "./env";
import { getGlobalLogger } from "./modules/shared/logger";
import { inventoryDB } from "./database/db";
import { startReconcilePaymentBullWorker } from "./modules/jobs/reconcile-payment";

const globalLogger = getGlobalLogger();

// add workers
const reconcileTransactionWorker = startReconcilePaymentBullWorker();

globalLogger.info('worker started')

async function gracefulShutdown() {
  globalLogger.info("gracefully shutting down");

  // close all workers
  await Promise.allSettled([reconcileTransactionWorker.close()]);

  await inventoryDB.close(false);

  process.exit(0);
}


process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

process.on("unhandledRejection", (reason, promise) => {
  globalLogger.error("Unhandled Rejection error", {
    context: "unhandledRejection",
    reason,
    promise,
  });
});

process.on("uncaughtException", (err, origin) => {
  globalLogger.error("Uncaught Exception error", {
    context: "uncaughtException",
    err,
    origin,
  });
});

process.on("exit", (code) => {
  globalLogger.info({
    msg: "Process exited",
    context: "exit",
    code,
  });
});