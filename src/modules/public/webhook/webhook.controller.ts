import { Request } from "express";
import { Logger } from "pino";
import { HeaderParams, JsonController, Post, Req } from "routing-controllers";
import { Inject, Service } from "typedi";
import PaystackHandler from "./paystack-webhook.handler";
import { PaystackHeaders } from "./dto/webhook.dto";

@Service()
@JsonController("/pub/webhook")
export default class WebhookController {
  constructor(
    private paystackHandler: PaystackHandler,
    @Inject("logger") private logger: Logger
  ) {}

  @Post("/paystack")
  paystackWebhook(
    @Req() req: Request,
    @HeaderParams() headers: PaystackHeaders
  ) {
    this.logger.info({
      msg: "received paystack webhook",
      body: req.body,
      headers: { "x-paystack-signature": headers["x-paystack-signature"] },
    });

    return this.paystackHandler.requestWebhook(req.rawBody, headers);
  }
}
