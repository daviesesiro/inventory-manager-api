import cookieParser from 'cookie-parser';
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { getMetadataArgsStorage, useExpressServer } from "routing-controllers";
import InventoryController from './modules/inventory/inventory.controller';
import WebhookController from "./modules/public/webhook/webhook.controller";
import { injectDiMiddleware } from "./modules/shared/middlewares/inject-di.middlware";
import useScopedContainer from "./modules/shared/use-scoped-container";
import { AuthController } from './modules/users/users.controller';
import requestLogger from './modules/shared/middlewares/request-logger.middleware';
import AppErrorHandler from './modules/shared/middlewares/error-handler.middleware';
import basicAuth from "express-basic-auth";
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';
const { defaultMetadataStorage } = require("class-transformer/cjs/storage");
import * as swaggerUiExpress from "swagger-ui-express";
import { routingControllersToSpec } from 'routing-controllers-openapi';

const app = express();
const whitelist = process.env.WHITELISTED_HOSTS?.split(",");

app.use(cookieParser())
app.use(helmet());
app.use(cors({ origin: whitelist, credentials: true }));

// INFO: some webhooks require raw request body for validation
app.use(express.json({
  type: ['application/json', 'text/plain'],
  verify: function (req: Request, res, buf) {
    if (req.originalUrl.includes("webhook")) req.rawBody = buf;
  }
}))

app.get("/health", (_, res) => {
  res.json({
    service: "inventory-manager-api",
    message: "Healthcheck OK! 👍",
  });
});

app.use(requestLogger);
app.use(injectDiMiddleware);

useScopedContainer();

const rcOptions = {
  routePrefix: "/v1",
  defaultErrorHandler: false,
  controllers: [AuthController, WebhookController, InventoryController],
  middlewares: [AppErrorHandler],
  classTransformer: false,
};

useExpressServer(app, rcOptions);

const schemas: any = validationMetadatasToSchemas({
  classTransformerMetadataStorage: defaultMetadataStorage,
  refPointerPrefix: "#/components/schemas/",
});

const storage = getMetadataArgsStorage();
const spec = routingControllersToSpec(storage, rcOptions, {
  components: { schemas },
});

// TODO: probably don't expose this on prod
app.use(
  "/docs",
  basicAuth({
    challenge: true,
    users: { inventory: "inventory" },
  }),
  swaggerUiExpress.serve,
  swaggerUiExpress.setup(spec)
);

// override express default 404 page
app.use((_: Request, res: Response, __: NextFunction) => {
  if (!res.headersSent) {
    res.status(404).json({
      message: "Resource does not exist",
      statusCode: 404,
    });
  }
  res.end();
});

export default app;
