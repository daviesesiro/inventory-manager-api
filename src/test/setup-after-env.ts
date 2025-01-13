import "reflect-metadata";
import {
  afterAll,
  beforeAll,
  afterEach,
  jest,
} from "@jest/globals";
import mongoose from "mongoose";
import { inventoryDB } from "../database/db";

jest.mock("bullmq");
jest.mock("../modules/shared/redis-client", () => ({
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
}));

let mdbConnection: mongoose.Connection;

beforeAll(async () => {
  mdbConnection = await inventoryDB.asPromise();
});

afterEach(async () => {
  jest.clearAllMocks();
  const collectionNames = Object.keys(inventoryDB.collections);
  await Promise.all(
    collectionNames.map(async (collection: string) => {
      await inventoryDB.collections[collection].deleteMany({});
    })
  );
});

afterAll(async () => {
  await mdbConnection.close();
});
