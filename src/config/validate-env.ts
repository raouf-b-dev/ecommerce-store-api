import { cleanEnv, str, port, num } from 'envalid';

export function validateEnv(env: NodeJS.ProcessEnv) {
  return cleanEnv(env, {
    NODE_ENV: str({
      choices: ['development', 'production', 'test', 'staging'],
    }),
    PORT: port({ default: 3000 }),

    REDIS_HOST: str(),
    REDIS_PORT: port({ default: 6379 }),
    REDIS_PASSWORD: str({ default: '' }),
    REDIS_KEYPREFIX: str({ default: '' }),
    REDIS_DB: num({ default: 0 }),

    DB_HOST: str(),
    DB_PORT: port({ default: 5432 }),
    DB_USERNAME: str(),
    DB_PASSWORD: str(),
    DB_DATABASE: str(),

    JWT_SECRET: str(),
    JWT_EXPIRES_IN: str(),
  });
}
