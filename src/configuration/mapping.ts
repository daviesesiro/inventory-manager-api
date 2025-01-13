/**
 * This is a mapping of all the environment variables that the project uses.
 * Getting a value from your config service should be done by calling
 * `configService.get(key)` where key is one of the keys in this object.
 */
export const configMapping = {
  logFormat: {
    env: "LOG_FORMAT",
    required: false,
  },
  whitelistedHosts: {
    env: "WHITELISTED_HOSTS",
    required: true,
  },
  serviceId: {
    env: "SERVICE_ID",
    required: true,
  },
  redisUrl: {
    env: "REDIS_URL",
    required: false,
  },
  DBUri: {
    env: "DB_URI",
    required: true,
  },
  isDebugMode: {
    env: "DEBUG",
    required: false,
  },
  jwtSecret: {
    env: "JWT_SECRET",
    required: true,
  },
  jwtRefreshSecret: {
    env: "REFRESH_JWT_SECRET",
    required: true,
  },
  nodeEnv: {
    env: "NODE_ENV",
    required: true,
  },
  paystackApiKey: {
    env: "PAYSTACK_API_KEY",
    required: true,
  },
  mailgunApiKey: {
    env: "MAILGUN_API_KEY",
    required: true,
  },
  mailgunDomain: {
    env: "MAILGUN_DOMAIN",
    required: true,
  },
  mailFrom: {
    env: "MAIL_FROM",
    required: true,
  },
  appUrl: {
    env: 'APP_URL',
    required: true
  }
} as const;
export type ConfigKey = keyof typeof configMapping;
