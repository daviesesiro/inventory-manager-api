import { beforeAll, describe, expect, it } from "@jest/globals";
import { ObjectId } from "mongodb";
import "reflect-metadata";
import Inventory from "../../../database/models/inventory.model";
import Payment, {
  PaymentProcessor,
  PaymentScope,
  PaymentStatus,
} from "../../../database/models/payment.model";
import { createPinoLogger } from "../../shared/logger";
import {
  ReconcilePaymentJob,
  ReconcilePaymentWorker,
} from "./worker";

async function setup() {
  const inventory = await Inventory.create({
    name: "Test Item",
    price: 100,
    currency: "NGN",
    createdBy: new ObjectId(),
    category: 'Category',
    quantity: 10,
    sku: "ITEM123",
  });

  const userId = new ObjectId();
  const paymentData: ReconcilePaymentJob = {
    processor: PaymentProcessor.Paystack,
    reference: "pay_ref_123",
    processorRef: "processor_ref_123",
    amount: 100,
    fee: 10,
    currency: "NGN",
    status: "successful",
    metadata: {
      intent: PaymentScope.InventoryItemPayment,
      inventory: inventory._id.toString(),
      user: userId.toString(),
    },
    processorResponse: "{}",
  };

  return { paymentData, inventory, userId };
}

describe("ReconcilePaymentWorker", () => {
  let reconcilePaymentWorker: ReconcilePaymentWorker;

  beforeAll(async () => {
    reconcilePaymentWorker = new ReconcilePaymentWorker(createPinoLogger());
  });

  describe("run", () => {
    it("should process a successful inventory payment", async () => {
      const { paymentData, inventory, userId } = await setup();

      await reconcilePaymentWorker.run(paymentData);

      const payment = await Payment.findOne({
        reference: paymentData.reference,
      });
      expect(payment).toBeTruthy();
      expect(payment?.status).toBe(PaymentStatus.Successful);
      expect(payment?.inventory?.toString()).toBe(inventory._id.toString());
      expect(payment?.user.toString()).toBe(userId.toString());
      expect(payment?.amount).toBe(paymentData.amount);

      // Check inventory quantity is updated
      const updatedInventory = await Inventory.findById(inventory._id);
      expect(updatedInventory?.quantity).toBe(inventory.quantity - 1);
    });

    it("should throw error when inventory does not exist", async () => {
      const { paymentData } = await setup();
      paymentData.metadata.inventory = new ObjectId().toString(); // Non-existent inventory

      await expect(
        reconcilePaymentWorker.run(paymentData)
      ).rejects.toThrowError("inventory not found");
    });

    it("should throw error for invalid payment amount", async () => {
      const { paymentData } = await setup();
      paymentData.amount = 999; // Invalid amount

      await expect(
        reconcilePaymentWorker.run(paymentData)
      ).rejects.toThrowError("invalid inventory payment received");
    });

    it("should log an error for duplicate payment", async () => {
      const { paymentData } = await setup();

      // Insert a payment record to simulate a duplicate
      await Payment.create({
        user: new ObjectId(),
        scope: PaymentScope.InventoryItemPayment,
        reference: paymentData.reference,
        processorRef: paymentData.processorRef,
        processor: paymentData.processor,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: PaymentStatus.Pending,
        metadata: paymentData.metadata,
        processorResponse: paymentData.processorResponse,
      });

      await expect(
        reconcilePaymentWorker.run(paymentData)
      ).rejects.toThrowError("duplicate payment");
    });

    it("should log an error if payment is unsuccessful", async () => {
      const { paymentData } = await setup();
      paymentData.status = "failed"; // Unsuccessful payment

      await reconcilePaymentWorker.run(paymentData);
    });

    it("should throw error for invalid intent", async () => {
      const { paymentData } = await setup();
      paymentData.metadata.intent = "invalid_intent" as PaymentScope; // Invalid intent

      await expect(
        reconcilePaymentWorker.run(paymentData)
      ).rejects.toThrowError("Invalid intent");
    });
  });
});
