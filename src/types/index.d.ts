import type { ContainerInstance } from "typedi";

import type { Logger } from "pino";

declare global {
  namespace Express {
    interface Request {
      rawBody: Buffer<ArrayBufferLike>
      logger: Logger;
      auth: AuthData;
      di: ContainerInstance;
    }
  }

  interface AuthData {
    userId: string;
    email: string
  }
}
