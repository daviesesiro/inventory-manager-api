import { Logger } from "pino";
import { Inject, Service } from "typedi";
import Inventory, {
  InventoryStatus,
} from "../../../database/models/inventory.model";
import Payment, {
  InventoryItemMetadata,
  IPayment,
  PaymentProcessor,
  PaymentScope,
  PaymentStatus,
} from "../../../database/models/payment.model";

import { inventoryDB } from "../../../database/db";
import { Worker } from "../utils";
import { ReconcilePaymentQueue } from "./queue";
import { MailerService } from "../../shared/mailer.service";
import User from "../../../database/models/user.model";

export type ReconcilePaymentJob = {
  processor: PaymentProcessor;
  reference: string;
  processorRef: string;
  amount: number;
  fee: number;
  currency: string;
  status: string;
  metadata: IPayment["metadata"];
  processorResponse: string;
};

@Service()
export class ReconcilePaymentWorker implements Worker<ReconcilePaymentJob> {
  readonly jobName = "reconcile-payment-job";

  constructor(@Inject("logger") private logger: Logger, private mailerService: MailerService) {
    this.logger = this.logger.child({}, { redact: ["*.processorResponse"] });
  }

  async trigger(data: ReconcilePaymentJob) {
    await ReconcilePaymentQueue.add(this.jobName, data);
  }

  async run(data: ReconcilePaymentJob) {
    this.logger.info({ msg: "payment reconciliation started", data });
    this.logger.setBindings({
      ctx: {
        reference: data.reference,
        processor: data.processor,
        intent: data.metadata.intent,
        amount: data.amount,
        currency: data.currency,
      },
    });

    switch (data.metadata.intent as PaymentScope) {
      case PaymentScope.InventoryItemPayment:
        return this.handleInventoryPayment(data);
      default:
        this.logger.error("invalid intent", { data });
        throw new Error("Invalid intent");
    }
  }

  private async handleInventoryPayment(data: ReconcilePaymentJob) {
    const { inventory: inventoryId, user: userId } =
      data.metadata as InventoryItemMetadata;
    if (data.status !== "successful") {
      return this.logger.info("payment not successful");
    }

    await this.assertPaymentDoesNotExist(data);

    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      // TODO: log on Payment dispute
      this.logger.error({ msg: "inventory not found", inventoryId });
      throw new Error("inventory not found");
    }

    if (
      inventory.price !== data.amount ||
      data.currency !== inventory.currency
    ) {
      this.logger.error({
        msg: "invalid payment amount",
        expected: {
          currency: inventory.currency,
          amount: inventory.price,
        },
      });

      // TODO: log on Payment dispute
      throw new Error("invalid inventory payment received");
    }

    if (inventory.status !== InventoryStatus.Available || !inventory.quantity) {
      this.logger.error({
        msg: "inventory is no longer available",
      });

      // TODO: log on Payment dispute
      throw new Error("inventory is no longer available");
    }

    await inventoryDB.transaction(async (session) => {
      await Payment.create(
        [
          {
            currency: data.currency,
            amount: data.amount,
            user: userId,
            status: PaymentStatus.Successful,
            scope: PaymentScope.InventoryItemPayment,
            inventory: inventory._id,
            reference: data.reference,
            processorRef: data.processorRef,
            processor: data.processor,
            processorResponse: data.processorResponse,
            metadata: data.metadata,
          },
        ],
        { session }
      );

      await Inventory.updateOne(
        { _id: inventory._id },
        {
          $inc: { quantity: -1 },
          $set: {
            status:
              inventory.quantity === 1
                ? InventoryStatus.OutOfStock
                : inventory.status,
          },
        }
      ).session(session);

      this.logger.info({
        msg: "item payment successful",
        inventory: inventory._id,
      });
    });

    const user = await User.findById(userId);
    if (user) {
      await this.mailerService.sendPaymentSuccessfulEmail(user.email, {
        name: inventory.name,
        inventory: inventory.name,
        price: inventory.price,
        currency: inventory.currency
      });
    }
  }

  private async assertPaymentDoesNotExist(data: ReconcilePaymentJob) {
    const tnxExists = await Payment.exists({
      $or: [
        { reference: data.reference },
        { processorRef: data.processorRef, processor: data.processor },
      ],
    });
    if (tnxExists) {
      this.logger.error("duplicate payment");
      throw new Error("duplicate payment");
    }
  }
}
