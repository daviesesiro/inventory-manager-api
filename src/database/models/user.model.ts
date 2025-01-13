import { Schema } from "mongoose";
import { inventoryDB } from "../db";
import { IDocument } from "./types";

export interface IUser extends IDocument {
  name: string;
  email: string;
  emailVerified: boolean
  password: string;
  refreshTokenVersion: number;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, unique: true },
    emailVerified: { type: Boolean, default: false },
    password: { type: String, required: true, select: false },
    refreshTokenVersion: { type: Number, default: 1, select: false },
  },
  { timestamps: true }
);

const User = inventoryDB.model<IUser>("User", UserSchema);
export default User;
