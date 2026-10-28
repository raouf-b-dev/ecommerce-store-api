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
import { Currency } from '../shared-kernel/domain/value-objects/currency';

const HTTP_ORIGIN_ERROR =
  'must be an http(s) origin with no path, query, or credentials (for example https://api.example.com)';

const CORS_ORIGINS_ERROR =
  'CORS_ALLOWED_ORIGINS must be a comma-separated list of http(s) origins';

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

/**
 * Splits, trims, drops empties, and validates each CORS origin.
 * Returns a comma-joined string of normalized origins for envalid storage.
 */
export function parseCorsAllowedOrigins(value: string): string {
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) {
    throw new EnvError(CORS_ORIGINS_ERROR);
  }
  return parts.map(parseHttpOrigin).join(',');
}

const corsAllowedOrigins = makeValidator<string>(parseCorsAllowedOrigins);

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
 * Skipped when mock payment auto-complete is on (staging demo path);
 * production already forbids that flag via assertNoMockPaymentAutoComplete.
 */
export function assertStripeWebhookSecret(
  nodeEnv: string,
  secret?: string,
  mockAutoComplete?: string,
): void {
  if (mockAutoComplete === 'true') {
    return;
  }
  if (nodeEnv !== 'production' && nodeEnv !== 'staging') {
    return;
  }
  if (!secret?.trim()) {
    throw new EnvError(`STRIPE_WEBHOOK_SECRET is required in ${nodeEnv}`);
  }
}

const CURRENCY_ERROR =
  'must be a valid ISO 4217 currency code with 0-3 decimal places';

export function parseCurrencyCode(value: string): string {
  const normalized = Currency.normalize(value);
  if (!normalized) {
    throw new EnvError(CURRENCY_ERROR);
  }
  return normalized;
}

export const currencyCode = makeValidator<string>(parseCurrencyCode);

/**
 * Production must never enable mock payment auto-complete so checkouts
 * cannot be confirmed without a verified gateway webhook. Staging may
 * enable it for the public demo until a real Stripe provider ships.
 */
export function assertNoMockPaymentAutoComplete(
  nodeEnv: string,
  enabled?: string,
): void {
  if (nodeEnv !== 'production') {
    return;
  }
  if (enabled === 'true') {
    throw new EnvError(
      'PAYMENT_MOCK_AUTO_COMPLETE must not be true in production',
    );
  }
}

/**
 * Production must never publish Swagger. Default SWAGGER_ENABLED is false;
 * this blocks an explicit true the way NODE_ENV gating did before the flag.
 */
export function assertSwaggerDisabledInProduction(
  nodeEnv: string,
  enabled?: string,
): void {
  if (nodeEnv !== 'production') {
    return;
  }
  if (enabled === 'true') {
    throw new EnvError('SWAGGER_ENABLED must not be true in production');
  }
}

/**
 * When Postgres TLS is on in production, certificate verification is required
 * so a managed host cannot silently accept MITM with rejectUnauthorized=false.
 */
export const DEMO_RESET_TOKEN_MIN_LENGTH = 32;

export const AUTH_COOKIE_SAMESITE_VALUES = ['strict', 'lax', 'none'] as const;

export type AuthCookieSameSite = (typeof AUTH_COOKIE_SAMESITE_VALUES)[number];

/**
 * Cross-origin refresh cookies (SameSite=None) are only valid with Secure,
 * which requires the API to be served over HTTPS.
 */
export function assertAuthCookieSameSite(
  sameSite: string,
  publicBaseUrl: string,
): void {
  if (sameSite !== 'none') {
    return;
  }
  if (new URL(publicBaseUrl).protocol !== 'https:') {
    throw new EnvError(
      'AUTH_COOKIE_SAMESITE=none requires PUBLIC_BASE_URL to use https so the refresh cookie can be Secure',
    );
  }
}

/**
 * The hosted-demo reset route is off unless explicitly enabled. A short or
 * empty token must not boot, so a default placeholder cannot authenticate.
 */
export function assertDemoResetToken(enabled: boolean, token: string): void {
  if (!enabled) {
    return;
  }
  if (token.trim().length < DEMO_RESET_TOKEN_MIN_LENGTH) {
    throw new EnvError(
      `DEMO_RESET_TOKEN must be at least ${DEMO_RESET_TOKEN_MIN_LENGTH} characters when DEMO_RESET_ENABLED=true`,
    );
  }
}

export function assertVerifiedDbTlsInProduction(
  nodeEnv: string,
  ssl: boolean,
  rejectUnauthorized: boolean,
): void {
  if (nodeEnv !== 'production') {
    return;
  }
  if (ssl && !rejectUnauthorized) {
    throw new EnvError(
      'DB_SSL_REJECT_UNAUTHORIZED must be true when DB_SSL=true in production',
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
    REDIS_TLS: bool({ default: false }),

    DB_HOST: str(),
    DB_PORT: port({ default: 5432 }),
    DB_USERNAME: str(),
    DB_PASSWORD: str(),
    DB_DATABASE: str(),
    DB_SSL: bool({ default: false }),
    DB_SSL_REJECT_UNAUTHORIZED: bool({ default: true }),
    IS_DB_SYNCHRONIZE: bool({ default: false }),

    STORE_DEFAULT_CURRENCY: currencyCode(),

    JWT_PRIVATE_KEY: str(),
    JWT_ACCESS_TOKEN_TTL: str({ default: '15m' }),
    JWT_REFRESH_TOKEN_TTL: duration({ default: '7d' }),

    JWT_CART_SESSION_TTL: str({ default: '7d' }),

    CORS_ALLOWED_ORIGINS: corsAllowedOrigins(),

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

    // Fail closed: omitted flag means no docs (production-safe).
    SWAGGER_ENABLED: str({ choices: ['true', 'false'], default: 'false' }),

    PAYMENT_MOCK_AUTO_COMPLETE: str({
      choices: ['true', 'false'],
      default: 'false',
    }),
    STRIPE_WEBHOOK_SECRET: str({ default: '' }),

    // Hosted demo reset is off unless a deployment opts in with a long token.
    DEMO_RESET_ENABLED: bool({ default: false }),
    DEMO_RESET_TOKEN: str({ default: '' }),
    // Shared hosted demo: seed the read-only viewer only. Mutations stay
    // on PermissionsGuard / RBAC (ADMIN_READONLY has products/orders/inventory views only). Leave false
    // for local Compose. Private writable owner: ADMIN_EMAIL / ADMIN_PASSWORD.
    DEMO_READ_ONLY: bool({ default: false }),
    // Demo seed account defaults (public labeled values; override on the host).
    DEMO_SUPERADMIN_EMAIL: str({ default: 'superadmin@store.local' }),
    DEMO_SUPERADMIN_PASSWORD: str({ default: 'SuperAdmin123!' }),
    DEMO_ADMIN_EMAIL: str({ default: 'admin@store.local' }),
    DEMO_ADMIN_PASSWORD: str({ default: 'Admin123!' }),
    DEMO_VIEWER_EMAIL: str({ default: 'viewer@store.local' }),
    DEMO_VIEWER_PASSWORD: str({ default: 'Viewer123!' }),
    DEMO_CUSTOMER_EMAIL: str({ default: 'customer@store.local' }),
    // Local Compose only: DEMO_READ_ONLY=true seeds no demo customer.
    DEMO_CUSTOMER_PASSWORD: str({ default: 'Customer123!' }),

    AUTH_COOKIE_SAMESITE: str({
      choices: ['strict', 'lax', 'none'],
      default: 'strict',
    }),
  });
  assertSecurePublicOrigin(validated.NODE_ENV, validated.PUBLIC_BASE_URL);
  assertStripeWebhookSecret(
    validated.NODE_ENV,
    validated.STRIPE_WEBHOOK_SECRET,
    validated.PAYMENT_MOCK_AUTO_COMPLETE,
  );

  assertNoMockPaymentAutoComplete(
    validated.NODE_ENV,
    validated.PAYMENT_MOCK_AUTO_COMPLETE,
  );
  assertSwaggerDisabledInProduction(
    validated.NODE_ENV,
    validated.SWAGGER_ENABLED,
  );
  assertVerifiedDbTlsInProduction(
    validated.NODE_ENV,
    validated.DB_SSL,
    validated.DB_SSL_REJECT_UNAUTHORIZED,
  );
  assertAuthCookieSameSite(
    validated.AUTH_COOKIE_SAMESITE,
    validated.PUBLIC_BASE_URL,
  );
  assertDemoResetToken(
    validated.DEMO_RESET_ENABLED,
    validated.DEMO_RESET_TOKEN,
  );
  return validated;
}
