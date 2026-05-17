import { JwtVerifierPort } from '../ports/jwt-verifier.port';
import {
  VerifiedAccessTokenPayload,
  VerifiedRefreshTokenPayload,
} from '../types/jwt-payload.types';

export class MockJwtVerifierService implements JwtVerifierPort {
  verifyAccessToken = jest.fn<Promise<VerifiedAccessTokenPayload>, [string]>();
  verifyRefreshToken = jest.fn<
    Promise<VerifiedRefreshTokenPayload>,
    [string]
  >();

  constructor() {
    this.verifyAccessToken.mockResolvedValue({
      sub: '1',
      email: 'test@example.com',
      role: 'CUSTOMER',
      customerId: 1,
      iss: 'ecommerce-api',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    this.verifyRefreshToken.mockResolvedValue({
      sub: '1',
      sessionId: 'mock-session-id',
      typ: 'refresh',
      iss: 'ecommerce-api',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
    });
  }
}
