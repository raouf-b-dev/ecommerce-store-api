import { JwtVerifierService } from '../../infrastructure/jwt/jwt-verifier.service';

export class MockJwtVerifierService implements Partial<JwtVerifierService> {
  verifyAccessToken = jest.fn().mockResolvedValue({});
  verifyRefreshToken = jest.fn().mockResolvedValue({});
}
