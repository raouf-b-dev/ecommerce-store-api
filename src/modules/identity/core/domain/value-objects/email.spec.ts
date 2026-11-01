import { normalizeEmail } from './email';

describe('normalizeEmail', () => {
  it('returns trimmed lowercase when input has spaces and uppercase', () => {
    expect(normalizeEmail('  MixCase-9@Test.local  ')).toBe(
      'mixcase-9@test.local',
    );
  });

  it('returns the same string when already lowercase and trimmed', () => {
    expect(normalizeEmail('user@example.com')).toBe('user@example.com');
  });
});
