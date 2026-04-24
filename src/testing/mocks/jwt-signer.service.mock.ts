import {
  JwtSignerService,
  RefreshTokenResult,
} from '../../infrastructure/jwt/jwt-signer.service';

const dummyPayload = Buffer.from(
  JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
).toString('base64url');
const dummyToken = `header.${dummyPayload}.signature`;

export class MockJwtSignerService implements Partial<JwtSignerService> {
  signAccessToken = jest.fn().mockResolvedValue(dummyToken);
  signRefreshToken = jest.fn().mockResolvedValue(dummyToken);
  signRefreshTokenWithSession = jest.fn().mockResolvedValue({
    token: dummyToken,
    sessionId: 'mock-session-id',
    expiresAt: new Date(Date.now() + 3600_000),
  } satisfies RefreshTokenResult);
}
