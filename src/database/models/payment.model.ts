import { PaginateModel, Schema, Types } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { inventoryDB } from "../db";
import { IDocument, PaymentCurrency } from "./types";

export enum PaymentStatus {
  Pending = "pending",
  Failed = "failed",
  Successful = "successful",
}

export enum PaymentScope {
  InventoryItemPayment = "inventory_item_payment",
}

export enum PaymentProcessor {
  Paystack = "paystack",
}

export type InventoryItemMetadata = {
  intent: PaymentScope.InventoryItemPayment;
  inventory: string;
  user: string;
};

export interface IPayment extends IDocument {
  currency: PaymentCurrency;
  fee: Number;
  amount: number;
  status: PaymentStatus;
  scope: PaymentScope;
  inventory?: Types.ObjectId;
  user: Types.ObjectId;
  reference: string;
  processorRef: string;
  processor: PaymentProcessor;
  processorResponse: string;
  metadata: InventoryItemMetadata;
}

export interface PaymentModel extends PaginateModel<IPayment> {}

const PaymentSchema = new Schema<IPayment>(
  {
    amount: { type: Number, required: true },
    fee: Number,
    scope: {
      type: String,
      enum: Object.values(PaymentScope),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.Pending,
    },
    reference: { type: String, required: true },
    processorRef: String,
    processor: {
      type: String,
      enum: Object.values(PaymentProcessor),
      required: true,
    },
    inventory: { type: Schema.Types.ObjectId, ref: "Inventory" },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    currency: {
      type: String,
      enum: Object.values(PaymentCurrency),
      required: true,
    },
    metadata: Object,
    processorResponse: String,
  },
  { timestamps: true }
);

PaymentSchema.plugin(mongoosePaginate);

const Payment = inventoryDB.model<IPayment, PaymentModel>(
  "Payment",
  PaymentSchema
);

export default Payment;
