import { validateEnv } from './validate-env';

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
    secret: string;
    expiresIn: string;
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
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
    },
  };
};
