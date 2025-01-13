import "reflect-metadata";
import "./env";
import { registerGlobalLogger } from "./modules/shared/logger";

const globalLogger = registerGlobalLogger();

import app from "./app";
import { inventoryDB } from "./database/db";

const PORT = Number(process.env.PORT) || 8080;
const server = app.listen(PORT, () => {
  globalLogger.info({
    msg: `Server started ⚡ on port ${PORT}`,
    context: "express-server",
  });
});

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

process.on("unhandledRejection", (reason, promise) => {
  globalLogger.error({
    msg: "unhandled Rejection error",
    context: "unhandledRejection",
    reason,
    promise,
  });
});

process.on("uncaughtException", (err, origin) => {
  globalLogger.error({
    msg: "uncaught Exception error",
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

function gracefulShutdown() {
  globalLogger.info("gracefully shutting down");
  server.close(async () => {
    await inventoryDB.close(false);
    process.exit(0);
  });
}
