import { JwtVerifierPort } from '../../../shared-kernel/domain/interfaces/jwt-verifier.port';
import {
  VerifiedAccessTokenPayload,
  VerifiedRefreshTokenPayload,
  VerifiedCartSessionPayload,
} from '../../../shared-kernel/domain/interfaces/jwt-payload.interface';

export class MockJwtVerifierService implements JwtVerifierPort {
  verifyAccessToken = jest.fn<Promise<VerifiedAccessTokenPayload>, [string]>();
  verifyRefreshToken = jest.fn<
    Promise<VerifiedRefreshTokenPayload>,
    [string]
  >();
  verifyCartSessionToken = jest.fn<
    Promise<VerifiedCartSessionPayload>,
    [string]
  >();

  constructor() {
    this.verifyAccessToken.mockResolvedValue({
      sub: '1',
      email: 'test@example.com',
      role: 'CUSTOMER',
      iss: 'ecommerce-api',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    this.verifyRefreshToken.mockResolvedValue({
      sub: '1',
      sid: 'mock-session-id',
      typ: 'refresh',
      iss: 'ecommerce-api',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
    });

    this.verifyCartSessionToken.mockResolvedValue({
      sub: 'guest',
      cartId: 1,
      typ: 'cart_session',
      iss: 'ecommerce-api',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
    });
  }
}
