import {
  cleanEnv,
  str,
  port,
  num,
  makeValidator,
  EnvError,
  bool,
} from 'envalid';
import { duration } from './validators/duration';

const HTTP_ORIGIN_ERROR =
  'must be an http(s) origin with no path, query, or credentials (for example https://api.example.com)';

/** Parses an http(s) origin and returns it normalized (lowercase host, no trailing slash). */
export function parseHttpOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new EnvError(HTTP_ORIGIN_ERROR);
  }
  const isOrigin =
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    url.pathname === '/' &&
    url.search === '' &&
    url.hash === '' &&
    url.username === '' &&
    url.password === '';
  if (!isOrigin) {
    throw new EnvError(HTTP_ORIGIN_ERROR);
  }
  return url.origin;
}

const httpOrigin = makeValidator<string>(parseHttpOrigin);

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Deployed environments must publish an https origin so stored image URLs are
 * not mixed content. Loopback stays allowed for local production-mode runs.
 */
export function assertSecurePublicOrigin(
  nodeEnv: string,
  origin: string,
): void {
  if (nodeEnv !== 'production' && nodeEnv !== 'staging') {
    return;
  }
  const { protocol, hostname } = new URL(origin);
  if (protocol === 'https:' || LOOPBACK_HOSTS.has(hostname)) {
    return;
  }
  throw new EnvError(
    `PUBLIC_BASE_URL must use https in ${nodeEnv} (got ${origin})`,
  );
}

/**
 * Deployed environments must configure STRIPE_WEBHOOK_SECRET to receive
 * verified Stripe webhooks. Fails fast at startup if missing.
 */
export function assertStripeWebhookSecret(
  nodeEnv: string,
  secret?: string,
): void {
  if (nodeEnv !== 'production' && nodeEnv !== 'staging') {
    return;
  }
  if (!secret?.trim()) {
    throw new EnvError(`STRIPE_WEBHOOK_SECRET is required in ${nodeEnv}`);
  }
}

/**
 * Validates that a string is an authoritative ISO 4217 3-letter currency code
 * supported by the runtime's Intl data. Fails fast at startup if invalid.
 */
export function assertValidIso4217Currency(currency: string): void {
  const normalized = currency?.trim().toUpperCase();
  const validCurrencies =
    typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('currency')
      : [];
  if (
    !normalized ||
    normalized.length !== 3 ||
    !validCurrencies.includes(normalized)
  ) {
    throw new EnvError(
      `STORE_DEFAULT_CURRENCY must be a valid ISO 4217 currency code (got "${currency}")`,
    );
  }
}

export function validateEnv(env: NodeJS.ProcessEnv) {
  const validated = cleanEnv(env, {
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
    POSTGRES_CONTAINER_NAME: str(),
    POSTGRES_IMAGE: str(),
    IS_DB_SYNCHRONIZE: bool({ default: false }),

    STORE_DEFAULT_CURRENCY: str({ default: 'USD' }),

    JWT_PRIVATE_KEY: str(),
    JWT_ACCESS_TOKEN_TTL: str({ default: '15m' }),
    JWT_REFRESH_TOKEN_TTL: duration({ default: '7d' }),

    JWT_CART_SESSION_TTL: str({ default: '7d' }),

    CORS_ALLOWED_ORIGINS: str(),

    LOG_LEVEL: str({
      choices: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'],
      default: 'debug',
    }),
    LOG_DIR: str({ default: './logs' }),
    LOG_TRANSPORT: str({
      choices: ['file', 'console', 'both'],
      default: 'both',
    }),

    THROTTLE_GLOBAL_LIMIT: num({ default: 100 }),
    THROTTLE_STRICT_LIMIT: num({ default: 10 }),

    TRUST_PROXY: str({ default: 'false' }),
    PUBLIC_BASE_URL: httpOrigin(),

    METRICS_API_KEY: str({ default: '' }),
    OTEL_TRACING_ENABLED: str({ choices: ['true', 'false'], default: 'true' }),
    OTEL_EXPORTER_OTLP_ENDPOINT: str({ default: 'http://localhost:4317' }),

    PAYMENT_MOCK_AUTO_COMPLETE: str({
      choices: ['true', 'false'],
      default: 'false',
    }),
    STRIPE_WEBHOOK_SECRET: str({ default: '' }),
  });
  assertSecurePublicOrigin(validated.NODE_ENV, validated.PUBLIC_BASE_URL);
  assertStripeWebhookSecret(
    validated.NODE_ENV,
    validated.STRIPE_WEBHOOK_SECRET,
  );
  assertValidIso4217Currency(validated.STORE_DEFAULT_CURRENCY);
  return validated;
}
