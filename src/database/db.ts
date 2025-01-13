import mongoose from "mongoose";
import { getConfigService } from "../configuration";
import { getGlobalLogger } from "../modules/shared/logger";

const logger = getGlobalLogger();
const configService = getConfigService()

if (!configService.getRequired('DBUri')) {
  throw new Error("Database uri for inventory is missing");
}

const inventoryDB = mongoose.createConnection(
  configService.getRequired("DBUri"),
);

inventoryDB.on("error", (err) => {
  logger.error({ msg: "connecion to db failed", err });
});

inventoryDB.once("open", function () {
  logger.info("MongoDB database connection to inventorydb successful");
});

export { inventoryDB };
