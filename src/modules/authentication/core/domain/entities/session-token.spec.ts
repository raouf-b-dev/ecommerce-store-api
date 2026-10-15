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

  it('replaces the secret and keeps the same session id', () => {
    const expiresAt = new Date('2099-01-01T00:00:00.000Z');
    const rotatedExpiry = new Date('2099-06-01T00:00:00.000Z');
    const session = SessionToken.create(1, 'raw-token', expiresAt, 'mock-id');
    const previousHash = session.tokenHash;

    session.rotate('next-token', rotatedExpiry);

    expect(session.id).toBe('mock-id');
    expect(session.isRevoked).toBe(false);
    expect(session.isValid).toBe(true);
    expect(session.tokenHash).not.toBe(previousHash);
    expect(session.isTokenMatch('raw-token')).toBe(false);
    expect(session.isTokenMatch('next-token')).toBe(true);
    expect(session.expiresAt.getTime()).toBe(rotatedExpiry.getTime());
  });

  it('should be invalid if expired', () => {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() - 1); // 1 hour ago

    const session = SessionToken.create(1, 'raw', expiresAt, 'mock-id');

    expect(session.isExpired).toBe(true);
    expect(session.isValid).toBe(false);
  });
});
