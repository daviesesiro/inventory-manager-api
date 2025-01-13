import { Worker as BullWorker } from "bullmq";
import type { Job, Queue } from "bullmq";
import { Constructable } from "typedi";
import { runInScope } from "../shared/utils";
import { createPinoLogger } from "../shared/logger";
import { Logger } from "pino";
import redisClient from "../shared/redis-client";

export abstract class Worker<T = unknown> {
  abstract jobName: string;
  abstract trigger(params: T): Promise<void>;
  abstract run(params: T): Promise<void>;
}

type WorkerFactoryParams = {
  concurrency?: number;
  queue: Queue;
  worker: Constructable<Worker>;
};

function getProcessorFn(params: WorkerFactoryParams) {
  return async (job: Job) => {
    await runInScope(async (container) => {
      const logger = container.get<Logger>("logger");

      try {
        const worker = container.get(params.worker) as Worker;
        logger.setBindings({ jobName: worker.jobName, jobId: job.id });

        await worker.run(job.data);
      } catch (err) {
        logger.error({ msg: `Failed to execute job`, err });
        throw err
      }
    });
  };
}

export function WorkerFactory(params: WorkerFactoryParams) {
  const worker = new BullWorker(params.queue.name, getProcessorFn(params), {
    autorun: false,
    connection: redisClient,
    concurrency: params.concurrency,
  });

  worker.run().catch((err) => {
    createPinoLogger({ context: "bull-job-setup" }).error({
      msg: "failed to start bull worker",
      err,
    });
  });

  return worker;
}
