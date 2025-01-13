import formData from "form-data";
import Mailgun from "mailgun.js";
import { IMailgunClient } from "mailgun.js/Interfaces";
import { Service } from "typedi";
import { ConfigService } from "../../configuration";
import { formatMoney } from "./utils";

interface SendParams {
  subject: string;
  to: string[] | string;
  html: string;
}

@Service()
export class MailerService {
  private readonly mg: IMailgunClient;
  private appUrl: string;

  constructor (private configService: ConfigService) {
    this.appUrl = configService.getRequired('appUrl')
    this.mg = new Mailgun(formData).client({
      username: "api",
      key: configService.getRequired("mailgunApiKey"),
    });
  }

  private async send(params: SendParams) {
    try {
      await this.mg.messages.create(
        this.configService.getRequired("mailgunDomain"),
        {
          from: this.configService.getRequired("mailFrom"),
          to: params.to,
          subject: params.subject,
          html: params.html,
        }
      );
    } catch (error) {
      console.error(error);
    }
  }

  async verifyUserEmail(email: string, payload: { otp: string; name: string }) {
    const { name, otp } = payload;
    await this.send({
      to: [email],
      subject: `Email verification`,
      html: `
       Dear ${name},<br/><br/> 
      Kindly use the provided One-time Password (OTP) to complete the process.<br/>
      Verification code: ${otp}.<br/>
      Please note that this will remain valid for the next 1 hour.
      `,
    });
  }

  async confirmPasswordReset(
    email: string,
    payload: { code: string; name: string }
  ) {
    const link = `${this.appUrl}/reset-password/${payload.code}`;
    await this.send({
      to: [email],
      subject: `Password reset`,
      html: `
      Dear ${payload.name},<br/><br/> 
      Click the link below to reset your password:<br/><br/>
      ${link}
      `,
    });
  }

  async sendPaymentSuccessfulEmail(
    email: string,
    payload: { currency: string; inventory: string; price: number; name: string }
  ) {
    await this.send({
      to: [email],
      subject: `Email verification`,
      html: `
      Dear ${payload.name},<br/><br/> 
      Your payment was succcessful.<br/><br/>
      Inventory: ${payload.inventory}
      Price: ${formatMoney(payload.price, payload.currency)}
      `,
    });
  }
}
