import { SessionToken } from './session-token';

describe('SessionToken', () => {
  it('should create a valid session token', () => {
    const rawToken = 'header.payload.signature';
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const session = SessionToken.create(1, rawToken, expiresAt, 'mock-id');

    expect(session.id).toBe('mock-id');
    expect(session.userId).toBe(1);
    expect(session.isValid).toBe(true);
    expect(session.isExpired).toBe(false);
    expect(session.isRevoked).toBe(false);
    expect(session.isTokenMatch(rawToken)).toBe(true);
    expect(session.isTokenMatch('invalid-token')).toBe(false);
  });

  it('should properly revoke a token', () => {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    const session = SessionToken.create(1, 'raw', expiresAt, 'mock-id');

    session.revoke();

    expect(session.isRevoked).toBe(true);
    expect(session.revokedAt).toBeInstanceOf(Date);
    expect(session.isValid).toBe(false);
  });

  it('should be invalid if expired', () => {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() - 1); // 1 hour ago

    const session = SessionToken.create(1, 'raw', expiresAt, 'mock-id');

    expect(session.isExpired).toBe(true);
    expect(session.isValid).toBe(false);
  });
});
