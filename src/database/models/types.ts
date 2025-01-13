import { Types } from "mongoose";

export type IDocument<TDocId extends string | Types.ObjectId = Types.ObjectId> =
  {
    _id: TDocId;
    createdAt: Date;
    updatedAt: Date;
  };

export enum PaymentCurrency {
  NGN = 'NGN',
  USD = 'USD'
}