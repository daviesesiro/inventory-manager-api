import { MongoMemoryReplSet } from "mongodb-memory-server";

export default async function globalSetup() {
  const replset = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });

  process.env.DB_URI = replset.getUri("inventory");
  (global as any).__MONGOINSTANCE = replset;
}
