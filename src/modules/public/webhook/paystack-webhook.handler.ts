import { Inject, Service } from "typedi";
import crypto from 'crypto'
import { Logger } from "pino";
import { UnauthorizedError } from "routing-controllers";
import { ConfigService } from "../../../configuration";
import { PaystackService } from "../../shared/http/paystack.service";
import { ReconcilePaymentJob, ReconcilePaymentWorker } from "../../jobs/reconcile-payment/worker";
import { PaymentProcessor } from "../../../database/models/payment.model";
import { PaystackHeaders } from "./dto/webhook.dto";

@Service()
export default class PaystackWebhookHandler {
  private readonly allowedWebooks = [
    "charge.success",
  ] as const;

  constructor(
    @Inject("logger") private logger: Logger,
    private configService: ConfigService,
    private paystackService: PaystackService,
    private reoncilePaymentWorker: ReconcilePaymentWorker
  ) {}

  async requestWebhook(body: any, headers: PaystackHeaders) {
    const expectedHmac = headers["x-paystack-signature"];
    const calcuatedHmac = this.createHmac(body);
    if (calcuatedHmac !== expectedHmac) {
      this.logger.error({
        msg: "invalid webhhook",
        expectedHmac,
        calcuatedHmac,
      });
      throw new UnauthorizedError("Invalid webhook");
    }

    const parsedBody = JSON.parse(body);

    const { event } = parsedBody;
    if (!this.allowedWebooks.includes(event)) {
      this.logger.info({ msg: "event type not allowed", event });
      return { message: "webhook_logged" };
    }

    switch (event as (typeof this.allowedWebooks)[number]) {
      case "charge.success":
        await this.onChargeSuccess(parsedBody);
        break;
      default:
        this.logger.info({ msg: "unhandled event", event });
        break;
    }

    return { message: "webhook handled" };
  }

  private async onChargeSuccess(body: Record<string, any>) {
    const reference = body.data.reference;
    const { data } = await this.paystackService.verifyPaymentByReference(
      reference
    );
    const job: ReconcilePaymentJob = {
      amount: data.amount,
      currency: data.currency,
      fee: Number(data.fees),
      metadata: data.metadata,
      status: "successful",
      processorResponse: JSON.stringify(data),
      processorRef: data.reference,
      reference: data.reference,
      processor: PaymentProcessor.Paystack,
    };

    await this.reoncilePaymentWorker.trigger(job);
  }

  createHmac(body: string) {
    const secret = this.configService.getRequired("paystackApiKey");
    return crypto.createHmac("sha512", secret).update(body).digest("hex");
  }
}