import { Inject, Service } from "typedi";
import axios, { AxiosInstance } from "axios";
import { ConfigService } from "../../../configuration";
import { Logger } from "pino";
import { HttpError, NotFoundError } from "routing-controllers";

interface InitialisePayment {
  amount: number;
  reference: string;
  currency: string;
  email: string;
  metadata: Record<string, unknown>;
}

@Service()
export class PaystackService {
  private http: AxiosInstance;

  constructor(
    private configService: ConfigService,
    @Inject("logger") private logger: Logger
  ) {
    this.logger = this.logger.child({ service: PaystackService.name });
    const apiKey = this.configService.getRequired("paystackApiKey");
    this.http = axios.create({
      baseURL: "https://api.paystack.co",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  }

  async verifyPaymentByReference(reference: string) {
    try {
      const { data, status } = await this.http.get(
        `transaction/verify/${reference}`
      );
      this.logger.info({
        msg: "verify paystack payment response",
        data,
        status,
      });
      return data;
    } catch (err: any) {
      this.logger.error({
        msg: "error verifying paystack payment",
        reason: err.response?.data || err?.message,
        reference,
      });

      if (err?.response?.status === 400) {
        throw new NotFoundError("Payment not found")
      }

      throw new HttpError(503, "Unable to verify payment");
    }
  }

  async initializePayment(payload: InitialisePayment) {
    try {
      const { data, status } = await this.http.post(
        `transaction/initialize`,
        payload
      );

      this.logger.info({
        msg: "initialise paystack payment response",
        data,
        status,
      });

      return data;
    } catch (err: any) {
      this.logger.error({
        msg: "error initializing payment",
        reason: err.response?.data || err?.message,
        payload,
      });

      throw new HttpError(503, "Unable to initialize payment");
    }
  }
}
