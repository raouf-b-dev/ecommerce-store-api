import { JwksService } from '../../infrastructure/jwt/jwks.service';

export class MockJwksService implements Partial<JwksService> {
  onModuleInit = jest.fn().mockResolvedValue(undefined);
  getPublicKey = jest.fn().mockReturnValue('mock-public-key');
  getJwks = jest.fn().mockReturnValue({ keys: [] });
}
