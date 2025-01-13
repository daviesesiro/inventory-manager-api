import { WorkerFactory } from "../utils";
import { ReconcilePaymentQueue } from "./queue";
import { ReconcilePaymentWorker } from "./worker";

export const startReconcilePaymentBullWorker = () =>
  WorkerFactory({
    queue: ReconcilePaymentQueue,
    worker: ReconcilePaymentWorker,
    concurrency: 10,
  });