import { PaginateModel, Schema, Types } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { IDocument, PaymentCurrency } from "./types";
import { inventoryDB } from "../db";

export enum InventoryStatus {
  Available = "available",
  OutOfStock = "out_of_stock",
  Discontinued = "discontinued",
}

export interface IInventory extends IDocument {
  name: string;
  description: string;
  category: string;
  price: number; // This is kobo/cents
  currency: string;
  quantity: number;
  sku: string;
  images: string[];
  status: InventoryStatus;
  createdBy: Types.ObjectId;
}

export interface InventoryModel extends PaginateModel<IInventory> {}

const InventorySchema = new Schema<IInventory>(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    currency: {
      type: String,
      enum: Object.values(PaymentCurrency),
      default: PaymentCurrency.NGN,
    },
    quantity: { type: Number, required: true },
    sku: { type: String, unique: true, required: true },
    images: { type: [String], default: [] },
    status: {
      type: String,
      enum: Object.values(InventoryStatus),
      default: InventoryStatus.Available,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

InventorySchema.plugin(mongoosePaginate);

const Inventory = inventoryDB.model<IInventory, InventoryModel>(
  "Inventory",
  InventorySchema,
  "inventory"
);
export default Inventory;
