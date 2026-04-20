import { JwtSignerService } from '../../infrastructure/jwt/jwt-signer.service';

export class MockJwtSignerService implements Partial<JwtSignerService> {
  signAccessToken = jest.fn().mockResolvedValue('test-token');
  signRefreshToken = jest.fn().mockResolvedValue('test-refresh-token');
}
