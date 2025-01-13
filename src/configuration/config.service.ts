import process from "node:process";

import { Container, Inject, Service } from "typedi";

import ConfigNotFoundError from "./error";
import { ConfigKey, configMapping } from "./mapping";
import { Logger } from "pino";

@Service()
export class ConfigService {
  constructor(@Inject("logger") private readonly logger: Logger) {}

  get(key: ConfigKey, defaultValue?: string): string | null {
    return process.env[configMapping[key].env] || defaultValue || null;
  }

  getRequired(key: ConfigKey): string {
    const value = this.get(key);
    if (value != null) {
      return value;
    }

    const e = new ConfigNotFoundError(
      `Missing required environment variable: ${key}`,
      key,
    );
    this.logger.error(e);
    throw e;
  }

  isDebugMode(): boolean {
    return this.get("isDebugMode")?.toLowerCase() === "true";
  }
}

/**
 * Since ConfigService is a singleton service, this works for cases where we need the service
 * without having to inject it into a class.
 */
export function getConfigService(): ConfigService {
  return Container.get(ConfigService);
}
