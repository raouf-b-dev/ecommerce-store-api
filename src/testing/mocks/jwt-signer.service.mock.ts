import {
  JwtSignerPort,
  RefreshTokenResult,
  SignAccessTokenPayload,
} from '../../modules/auth/core/application/ports/jwt-signer.port';

const dummyPayload = Buffer.from(
  JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
).toString('base64url');
const dummyToken = `header.${dummyPayload}.signature`;

export class MockJwtSignerService implements JwtSignerPort {
  signAccessToken = jest
    .fn<Promise<string>, [SignAccessTokenPayload]>()
    .mockResolvedValue(dummyToken);
  signRefreshToken = jest
    .fn<Promise<string>, [Record<string, unknown>]>()
    .mockResolvedValue(dummyToken);
  signRefreshTokenWithSession = jest
    .fn<Promise<RefreshTokenResult>, [Record<string, unknown>]>()
    .mockResolvedValue({
      token: dummyToken,
      sessionId: 'mock-session-id',
      expiresAt: new Date(Date.now() + 3600_000),
    });
}
