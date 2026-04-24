import { validateEnv } from './validate-env';
import { StringValue } from 'ms';

export interface IAppConfig {
  node: {
    env: string;
    port: number;
  };
  redis: {
    host: string;
    port: number;
    password: string;
    key_prefix: string;
    db: number;
  };
  postgres: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    database?: string;
  };
  jwt: {
    privateKey: string;
    accessTokenTtl: string;
    refreshTokenTtl: string;
  };
  logging: { level: string; dir: string; transport: string };
  cors: {
    allowedOrigins: string[];
  };
}

export type AppConfigKey = keyof IAppConfig;

export default (): IAppConfig => {
  const env = validateEnv(process.env);

  return {
    node: {
      env: env.NODE_ENV || 'development',
      port: env.PORT || 3000,
    },
    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      key_prefix: env.REDIS_KEYPREFIX,
      db: env.REDIS_DB,
    },
    postgres: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      username: env.DB_USERNAME,
      password: env.DB_PASSWORD,
      database: env.DB_DATABASE,
    },
    jwt: {
      privateKey: env.JWT_PRIVATE_KEY,
      accessTokenTtl: env.JWT_ACCESS_TOKEN_TTL,
      refreshTokenTtl: env.JWT_REFRESH_TOKEN_TTL,
    },
    logging: {
      level: env.LOG_LEVEL,
      dir: env.LOG_DIR,
      transport: env.LOG_TRANSPORT,
    },
    cors: {
      allowedOrigins: env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
    },
  };
};
