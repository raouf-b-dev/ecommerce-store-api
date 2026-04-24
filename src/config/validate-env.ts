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

    JWT_PRIVATE_KEY: str(),
    JWT_ACCESS_TOKEN_TTL: str({ default: '15m' }),
    JWT_REFRESH_TOKEN_TTL: str({ default: '7d' }),

    CORS_ALLOWED_ORIGINS: str({
      default: 'http://localhost:3000,http://localhost:5173',
    }),

    LOG_LEVEL: str({
      choices: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'],
      default: 'debug',
    }),
    LOG_DIR: str({ default: './logs' }),
    LOG_TRANSPORT: str({
      choices: ['file', 'console', 'both'],
      default: 'both',
    }),
  });
}
