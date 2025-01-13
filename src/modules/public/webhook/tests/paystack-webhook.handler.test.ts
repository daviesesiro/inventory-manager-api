import "reflect-metadata";
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { NotFoundError, UnauthorizedError } from "routing-controllers";
import PaystackWebhookHandler from "../paystack-webhook.handler";
import { PaystackService } from "../../../shared/http/paystack.service";
import { ReconcilePaymentWorker } from "../../../jobs/reconcile-payment/worker";
import { ConfigService } from "../../../../configuration";
import { createPinoLogger } from "../../../shared/logger";

jest.mock("../../../shared/http/paystack.service");

class MockConfigService {
  getRequired(key: string) {
    const mockConfig: Record<string, string> = {
      paystackApiKey: "api-key",
    };
    return mockConfig[key];
  }
}

describe("PaystackWebhookHandler", () => {
  let webhookHandler: PaystackWebhookHandler;
  let mockPaystackService: jest.Mocked<PaystackService>;
  let mockReconcilePaymentWorker: jest.Mocked<ReconcilePaymentWorker>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockConfigService = new MockConfigService() as jest.Mocked<ConfigService>;
    mockPaystackService = {
      verifyPaymentByReference: jest
        .fn<any>()
        .mockImplementation((key: string) => {
          if (key === "bad_ref") throw new NotFoundError();

          return {
            data: {
              amount: 1000,
              currency: "NGN",
              fees: 50,
              metadata: { intent: "payment_intent" },
              reference: "pay_ref_123",
            },
          };
        }),
    } as unknown as jest.Mocked<PaystackService>;

    mockReconcilePaymentWorker = {
      trigger: jest.fn(),
    } as unknown as jest.Mocked<ReconcilePaymentWorker>;

    jest
      .spyOn(PaystackWebhookHandler.prototype, "createHmac")
      .mockReturnValue("valid-hmac");

    webhookHandler = new PaystackWebhookHandler(
      createPinoLogger(),
      mockConfigService,
      mockPaystackService,
      mockReconcilePaymentWorker
    );
  });

  describe("requestWebhook", () => {
    it("should throw UnauthorizedError when HMAC signature is invalid", async () => {
      const invalidHeaders = { "x-paystack-signature": "invalid-hmac" };
      const body = JSON.stringify({ event: "charge.success", data: {} });

      await expect(
        webhookHandler.requestWebhook(body, invalidHeaders)
      ).rejects.toThrow(UnauthorizedError);
    });

    it("should return 'webhook_logged' if event is not allowed", async () => {
      const validHeaders = { "x-paystack-signature": "valid-hmac" };
      const body = JSON.stringify({ event: "charge.failed", data: {} });

      const result = await webhookHandler.requestWebhook(body, validHeaders);

      expect(result).toEqual({ message: "webhook_logged" });
    });

    it("should handle charge.success event", async () => {
      const validHeaders = { "x-paystack-signature": "valid-hmac" };
      const body = JSON.stringify({
        event: "charge.success",
        data: { reference: "pay_ref_123" },
      });

      await webhookHandler.requestWebhook(body, validHeaders);

      expect(mockPaystackService.verifyPaymentByReference).toHaveBeenCalledWith(
        "pay_ref_123"
      );

      expect(mockReconcilePaymentWorker.trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: "pay_ref_123",
          amount: 1000,
          currency: "NGN",
          fee: 50,
          processorRef: "pay_ref_123",
          status: "successful",
        })
      );
    });

    it("should handle unknown event types gracefully", async () => {
      const validHeaders = { "x-paystack-signature": "valid-hmac" };
      const body = JSON.stringify({ event: "unknown.event", data: {} });

      await webhookHandler.requestWebhook(body, validHeaders);
    });
  });
});
