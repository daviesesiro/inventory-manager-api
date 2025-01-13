import { IsNotEmpty, IsString } from "class-validator";

export class PaystackHeaders {
  @IsString()
  @IsNotEmpty()
  "x-paystack-signature": string;
}
