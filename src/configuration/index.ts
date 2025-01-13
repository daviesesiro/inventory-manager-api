import { createPinoLogger } from "../modules/shared/logger";
import { configMapping } from "./mapping";

export { ConfigService, getConfigService } from "./config.service";
export { default as ConfigNotFoundError } from "./error";

export function validateRequiredEnvVars(): void {
  const missingEnvVars = Object.values(configMapping).filter(
    (envVar) => !process.env[envVar.env],
  );

  if (missingEnvVars.some((e) => e.required)) {
    throw new Error(
      `Missing environment variables: ${missingEnvVars
        .filter((e) => e.required)
        .map((e) => e.env)
        .join(", ")}`,
    );
  }

  if (missingEnvVars.length) {
    const logger = createPinoLogger();
    logger.setBindings({ context: "envValidation" });
    logger.warn(
      `missing environment variables: ${missingEnvVars.map((e) => e.env).join(", ")}`,
    );
  }
}
