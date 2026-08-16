import {
  JwtSignerPort,
  RefreshTokenResult,
  SignAccessTokenPayload,
  SignRefreshTokenPayload,
} from '../../modules/authentication/core/application/ports/jwt-signer.port';

const dummyPayload = Buffer.from(
  JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
).toString('base64url');
const dummyToken = `header.${dummyPayload}.signature`;

export class MockJwtSignerService implements JwtSignerPort {
  signAccessToken = jest
    .fn<Promise<string>, [SignAccessTokenPayload]>()
    .mockResolvedValue(dummyToken);
  signRefreshToken = jest
    .fn<Promise<string>, [SignRefreshTokenPayload]>()
    .mockResolvedValue(dummyToken);
  signRefreshTokenWithSession = jest
    .fn<Promise<RefreshTokenResult>, [Pick<SignRefreshTokenPayload, 'sub'>]>()
    .mockResolvedValue({
      token: dummyToken,
      sessionId: 'mock-session-id',
      expiresAt: new Date(Date.now() + 3600_000),
    });
  signCartSessionToken = jest
    .fn<Promise<string>, [number]>()
    .mockResolvedValue(dummyToken);
}
