import { EnvError } from 'envalid';
import {
  assertSecurePublicOrigin,
  assertStripeWebhookSecret,
  parseHttpOrigin,
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
