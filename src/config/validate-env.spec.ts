import { EnvError } from 'envalid';
import {
  assertNoMockPaymentAutoComplete,
  assertSecurePublicOrigin,
  assertStripeWebhookSecret,
  assertSwaggerDisabledInProduction,
  assertVerifiedDbTlsInProduction,
  parseCorsAllowedOrigins,
  parseCurrencyCode,
  parseHttpOrigin,
  validateEnv,
} from './validate-env';

describe('assertSecurePublicOrigin', () => {
  it('allows http outside deployed environments', () => {
    expect(() =>
      assertSecurePublicOrigin('development', 'http://api.internal:3000'),
    ).not.toThrow();
  });

  it.each(['production', 'staging'])(
    'requires https in %s except on loopback',
    (nodeEnv) => {
      expect(() =>
        assertSecurePublicOrigin(nodeEnv, 'https://api.example.com'),
      ).not.toThrow();
      expect(() =>
        assertSecurePublicOrigin(nodeEnv, 'http://localhost:3000'),
      ).not.toThrow();
      expect(() =>
        assertSecurePublicOrigin(nodeEnv, 'http://api.example.com'),
      ).toThrow(EnvError);
    },
  );
});

describe('parseHttpOrigin', () => {
  it('returns the normalized origin', () => {
    expect(parseHttpOrigin('http://localhost:3000')).toBe(
      'http://localhost:3000',
    );
    expect(parseHttpOrigin(' https://API.Example.com/ ')).toBe(
      'https://api.example.com',
    );
  });

  it.each([
    '',
    'localhost:3000',
    'ftp://files.example.com',
    'https://api.example.com/v1',
    'https://api.example.com?x=1',
    'https://api.example.com#top',
    'https://user:pass@api.example.com',
  ])('rejects %p', (value) => {
    expect(() => parseHttpOrigin(value)).toThrow(EnvError);
  });
});

describe('parseCorsAllowedOrigins', () => {
  it('normalizes a comma-separated list and drops empties', () => {
    expect(
      parseCorsAllowedOrigins(
        ' http://localhost:3000 , https://API.Example.com/ ,',
      ),
    ).toBe('http://localhost:3000,https://api.example.com');
  });

  it('rejects an empty list', () => {
    expect(() => parseCorsAllowedOrigins(' , , ')).toThrow(EnvError);
  });

  it('rejects an invalid origin in the list', () => {
    expect(() =>
      parseCorsAllowedOrigins('http://localhost:3000,not-an-origin'),
    ).toThrow(EnvError);
  });
});

describe('assertStripeWebhookSecret', () => {
  it.each(['development', 'test'])('allows empty secret in %s', (nodeEnv) => {
    expect(() => assertStripeWebhookSecret(nodeEnv, '')).not.toThrow();
    expect(() => assertStripeWebhookSecret(nodeEnv)).not.toThrow();
    expect(() =>
      assertStripeWebhookSecret(nodeEnv, 'whsec_test'),
    ).not.toThrow();
  });

  it.each(['production', 'staging'])('requires secret in %s', (nodeEnv) => {
    expect(() =>
      assertStripeWebhookSecret(nodeEnv, 'whsec_test'),
    ).not.toThrow();
    expect(() => assertStripeWebhookSecret(nodeEnv, '')).toThrow(EnvError);
    expect(() => assertStripeWebhookSecret(nodeEnv, '   ')).toThrow(EnvError);
    expect(() => assertStripeWebhookSecret(nodeEnv)).toThrow(EnvError);
  });

  it('allows empty secret in staging when mock auto-complete is enabled', () => {
    expect(() =>
      assertStripeWebhookSecret('staging', '', 'true'),
    ).not.toThrow();
    expect(() =>
      assertStripeWebhookSecret('staging', undefined, 'true'),
    ).not.toThrow();
  });

  it('still requires secret in staging when mock auto-complete is off', () => {
    expect(() => assertStripeWebhookSecret('staging', '', 'false')).toThrow(
      EnvError,
    );
  });
});

describe('parseCurrencyCode', () => {
  it.each(['USD', 'EUR', 'GBP', 'CAD', 'JPY', 'KWD', 'BHD'])(
    'accepts valid ISO currency %s',
    (curr) => {
      expect(parseCurrencyCode(curr)).toBe(curr);
    },
  );

  it('normalizes lowercase currency to uppercase', () => {
    expect(parseCurrencyCode('usd')).toBe('USD');
    expect(parseCurrencyCode('jpy')).toBe('JPY');
    expect(parseCurrencyCode('  kwd  ')).toBe('KWD');
  });

  it.each(['', 'US', 'USDD', 'XYZ', '123', '$$$', 'INVALID'])(
    'rejects invalid currency %s',
    (curr) => {
      expect(() => parseCurrencyCode(curr)).toThrow(EnvError);
      expect(() => parseCurrencyCode(curr)).toThrow(
        'must be a valid ISO 4217 currency code with 0-3 decimal places',
      );
    },
  );
});

describe('assertNoMockPaymentAutoComplete', () => {
  it.each(['development', 'test', 'staging'])(
    'allows mock auto-complete in %s',
    (nodeEnv) => {
      expect(() =>
        assertNoMockPaymentAutoComplete(nodeEnv, 'true'),
      ).not.toThrow();
      expect(() =>
        assertNoMockPaymentAutoComplete(nodeEnv, 'false'),
      ).not.toThrow();
      expect(() => assertNoMockPaymentAutoComplete(nodeEnv)).not.toThrow();
    },
  );

  it('rejects mock auto-complete in production', () => {
    expect(() => assertNoMockPaymentAutoComplete('production', 'true')).toThrow(
      EnvError,
    );
    expect(() =>
      assertNoMockPaymentAutoComplete('production', 'false'),
    ).not.toThrow();
    expect(() => assertNoMockPaymentAutoComplete('production')).not.toThrow();
  });
});

describe('assertSwaggerDisabledInProduction', () => {
  it.each(['development', 'test', 'staging'])(
    'allows swagger in %s',
    (nodeEnv) => {
      expect(() =>
        assertSwaggerDisabledInProduction(nodeEnv, 'true'),
      ).not.toThrow();
    },
  );

  it('rejects swagger in production', () => {
    expect(() =>
      assertSwaggerDisabledInProduction('production', 'true'),
    ).toThrow(EnvError);
    expect(() =>
      assertSwaggerDisabledInProduction('production', 'false'),
    ).not.toThrow();
  });
});

describe('assertVerifiedDbTlsInProduction', () => {
  it('allows rejectUnauthorized=false outside production', () => {
    expect(() =>
      assertVerifiedDbTlsInProduction('staging', true, false),
    ).not.toThrow();
  });

  it('allows SSL with verification in production', () => {
    expect(() =>
      assertVerifiedDbTlsInProduction('production', true, true),
    ).not.toThrow();
  });

  it('rejects unverified SSL in production', () => {
    expect(() =>
      assertVerifiedDbTlsInProduction('production', true, false),
    ).toThrow(EnvError);
  });

  it('allows SSL off with rejectUnauthorized=false in production', () => {
    expect(() =>
      assertVerifiedDbTlsInProduction('production', false, false),
    ).not.toThrow();
  });
});

describe('validateEnv', () => {
  const baseEnv: NodeJS.ProcessEnv = {
    NODE_ENV: 'development',
    REDIS_HOST: 'localhost',
    DB_HOST: 'localhost',
    DB_USERNAME: 'postgres',
    DB_PASSWORD: 'password',
    DB_DATABASE: 'test_db',
    JWT_PRIVATE_KEY: 'test-key',
    CORS_ALLOWED_ORIGINS: 'http://localhost:3000',
    PUBLIC_BASE_URL: 'http://localhost:3000',
    STORE_DEFAULT_CURRENCY: 'USD',
  };

  it('defaults IS_DB_SYNCHRONIZE to false when omitted', () => {
    const validated = validateEnv(baseEnv);
    expect(validated.IS_DB_SYNCHRONIZE).toBe(false);
  });

  it('parses IS_DB_SYNCHRONIZE=true', () => {
    const validated = validateEnv({ ...baseEnv, IS_DB_SYNCHRONIZE: 'true' });
    expect(validated.IS_DB_SYNCHRONIZE).toBe(true);
  });

  it('parses IS_DB_SYNCHRONIZE=false', () => {
    const validated = validateEnv({ ...baseEnv, IS_DB_SYNCHRONIZE: 'false' });
    expect(validated.IS_DB_SYNCHRONIZE).toBe(false);
  });

  it('rejects when STORE_DEFAULT_CURRENCY is missing', () => {
    const { STORE_DEFAULT_CURRENCY: _omitted, ...envWithoutCurrency } = baseEnv;
    expect(() => validateEnv(envWithoutCurrency)).toThrow();
  });

  it('rejects invalid STORE_DEFAULT_CURRENCY', () => {
    expect(() =>
      validateEnv({ ...baseEnv, STORE_DEFAULT_CURRENCY: 'INVALID' }),
    ).toThrow();
  });

  it('accepts valid STORE_DEFAULT_CURRENCY (e.g. JPY)', () => {
    const validated = validateEnv({
      ...baseEnv,
      STORE_DEFAULT_CURRENCY: 'JPY',
    });
    expect(validated.STORE_DEFAULT_CURRENCY).toBe('JPY');
  });

  it('normalizes lowercase STORE_DEFAULT_CURRENCY to uppercase', () => {
    const validated = validateEnv({
      ...baseEnv,
      STORE_DEFAULT_CURRENCY: 'usd',
    });
    expect(validated.STORE_DEFAULT_CURRENCY).toBe('USD');
  });

  it('rejects PAYMENT_MOCK_AUTO_COMPLETE=true in production', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
        PUBLIC_BASE_URL: 'https://api.example.com',
        PAYMENT_MOCK_AUTO_COMPLETE: 'true',
      }),
    ).toThrow(EnvError);
  });

  it('allows PAYMENT_MOCK_AUTO_COMPLETE=true in staging', () => {
    const validated = validateEnv({
      ...baseEnv,
      NODE_ENV: 'staging',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
      PUBLIC_BASE_URL: 'https://api.example.com',
      PAYMENT_MOCK_AUTO_COMPLETE: 'true',
    });
    expect(validated.PAYMENT_MOCK_AUTO_COMPLETE).toBe('true');
  });

  it('allows empty STRIPE_WEBHOOK_SECRET in staging when mock auto-complete is on', () => {
    const validated = validateEnv({
      ...baseEnv,
      NODE_ENV: 'staging',
      STRIPE_WEBHOOK_SECRET: '',
      PUBLIC_BASE_URL: 'https://api.example.com',
      PAYMENT_MOCK_AUTO_COMPLETE: 'true',
    });
    expect(validated.PAYMENT_MOCK_AUTO_COMPLETE).toBe('true');
    expect(validated.STRIPE_WEBHOOK_SECRET).toBe('');
  });

  it('defaults TLS off and Swagger off when omitted', () => {
    const validated = validateEnv(baseEnv);
    expect(validated.DB_SSL).toBe(false);
    expect(validated.DB_SSL_REJECT_UNAUTHORIZED).toBe(true);
    expect(validated.REDIS_TLS).toBe(false);
    expect(validated.SWAGGER_ENABLED).toBe('false');
  });

  it('parses DB_SSL and REDIS_TLS when enabled', () => {
    const validated = validateEnv({
      ...baseEnv,
      DB_SSL: 'true',
      DB_SSL_REJECT_UNAUTHORIZED: 'false',
      REDIS_TLS: 'true',
      SWAGGER_ENABLED: 'true',
    });
    expect(validated.DB_SSL).toBe(true);
    expect(validated.DB_SSL_REJECT_UNAUTHORIZED).toBe(false);
    expect(validated.REDIS_TLS).toBe(true);
    expect(validated.SWAGGER_ENABLED).toBe('true');
  });

  it('rejects SWAGGER_ENABLED=true in production', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
        PUBLIC_BASE_URL: 'https://api.example.com',
        SWAGGER_ENABLED: 'true',
      }),
    ).toThrow(EnvError);
  });

  it('rejects DB_SSL with rejectUnauthorized=false in production', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
        PUBLIC_BASE_URL: 'https://api.example.com',
        DB_SSL: 'true',
        DB_SSL_REJECT_UNAUTHORIZED: 'false',
      }),
    ).toThrow(EnvError);
  });

  it('defaults demo reset off, read-only off, and refresh cookie SameSite strict', () => {
    const validated = validateEnv(baseEnv);
    expect(validated.DEMO_RESET_ENABLED).toBe(false);
    expect(validated.DEMO_RESET_TOKEN).toBe('');
    expect(validated.DEMO_READ_ONLY).toBe(false);
    expect(validated.AUTH_COOKIE_SAMESITE).toBe('strict');
  });

  it('rejects demo reset when enabled without a long token', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        DEMO_RESET_ENABLED: 'true',
        DEMO_RESET_TOKEN: 'change-me',
      }),
    ).toThrow(EnvError);
  });

  it('accepts demo reset when enabled with a long placeholder token', () => {
    const validated = validateEnv({
      ...baseEnv,
      DEMO_RESET_ENABLED: 'true',
      DEMO_RESET_TOKEN: 'x'.repeat(32),
    });
    expect(validated.DEMO_RESET_ENABLED).toBe(true);
  });

  it('rejects SameSite=None unless PUBLIC_BASE_URL is https', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        AUTH_COOKIE_SAMESITE: 'none',
        PUBLIC_BASE_URL: 'http://localhost:3000',
      }),
    ).toThrow(EnvError);
  });

  it('accepts SameSite=None when PUBLIC_BASE_URL is https', () => {
    const validated = validateEnv({
      ...baseEnv,
      AUTH_COOKIE_SAMESITE: 'none',
      PUBLIC_BASE_URL: 'https://api.example.com',
    });
    expect(validated.AUTH_COOKIE_SAMESITE).toBe('none');
  });

  it('rejects invalid CORS_ALLOWED_ORIGINS entries', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        CORS_ALLOWED_ORIGINS: 'http://localhost:3000,bad',
      }),
    ).toThrow();
  });
});
