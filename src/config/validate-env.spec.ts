import { EnvError } from 'envalid';
import {
  assertNoMockPaymentAutoComplete,
  assertSecurePublicOrigin,
  assertStripeWebhookSecret,
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

describe('assertNoMockPaymentAutoComplete', () => {
  it.each(['development', 'test'])(
    'allows mock auto-complete in %s',
    (nodeEnv) => {
      expect(() =>
        assertNoMockPaymentAutoComplete(nodeEnv, 'true'),
      ).not.toThrow();
      expect(() =>
        assertNoMockPaymentAutoComplete(nodeEnv, true),
      ).not.toThrow();
      expect(() =>
        assertNoMockPaymentAutoComplete(nodeEnv, 'false'),
      ).not.toThrow();
      expect(() =>
        assertNoMockPaymentAutoComplete(nodeEnv, false),
      ).not.toThrow();
      expect(() => assertNoMockPaymentAutoComplete(nodeEnv)).not.toThrow();
    },
  );

  it.each(['production', 'staging'])(
    'rejects mock auto-complete in %s',
    (nodeEnv) => {
      expect(() => assertNoMockPaymentAutoComplete(nodeEnv, 'true')).toThrow(
        EnvError,
      );
      expect(() => assertNoMockPaymentAutoComplete(nodeEnv, true)).toThrow(
        EnvError,
      );
      expect(() =>
        assertNoMockPaymentAutoComplete(nodeEnv, 'false'),
      ).not.toThrow();
      expect(() =>
        assertNoMockPaymentAutoComplete(nodeEnv, false),
      ).not.toThrow();
      expect(() => assertNoMockPaymentAutoComplete(nodeEnv)).not.toThrow();
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
});
