import { EnvError } from 'envalid';
import {
  assertSecurePublicOrigin,
  assertStripeWebhookSecret,
  assertValidIso4217Currency,
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
});

describe('assertValidIso4217Currency', () => {
  it.each(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'aud'])(
    'accepts valid ISO currency %s',
    (curr) => {
      expect(() => assertValidIso4217Currency(curr)).not.toThrow();
    },
  );

  it.each(['', 'US', 'USDD', 'XYZ', '123', '$$$'])(
    'rejects invalid currency %s',
    (curr) => {
      expect(() => assertValidIso4217Currency(curr)).toThrow(EnvError);
    },
  );
});

describe('validateEnv', () => {
  const baseEnv: NodeJS.ProcessEnv = {
    NODE_ENV: 'development',
    REDIS_HOST: 'localhost',
    DB_HOST: 'localhost',
    DB_USERNAME: 'postgres',
    DB_PASSWORD: 'password',
    DB_DATABASE: 'test_db',
    POSTGRES_CONTAINER_NAME: 'postgres-db',
    POSTGRES_IMAGE: 'postgres:18.4',
    JWT_PRIVATE_KEY: 'test-key',
    CORS_ALLOWED_ORIGINS: 'http://localhost:3000',
    PUBLIC_BASE_URL: 'http://localhost:3000',
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

  it('defaults STORE_DEFAULT_CURRENCY to USD when omitted', () => {
    const validated = validateEnv(baseEnv);
    expect(validated.STORE_DEFAULT_CURRENCY).toBe('USD');
  });

  it('rejects invalid STORE_DEFAULT_CURRENCY', () => {
    expect(() =>
      validateEnv({ ...baseEnv, STORE_DEFAULT_CURRENCY: 'INVALID' }),
    ).toThrow(EnvError);
  });
});
