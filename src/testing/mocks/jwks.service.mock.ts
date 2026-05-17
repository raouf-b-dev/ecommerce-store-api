import { JwksPort } from '../../infrastructure/jwt/ports/jwks.port';

export class MockJwksService implements JwksPort {
  onModuleInit = jest.fn().mockResolvedValue(undefined);
  getPublicKey = jest
    .fn()
    .mockReturnValue('mock-public-key' as unknown as CryptoKey);
  getJwks = jest.fn().mockReturnValue({ keys: [] });
  getKid = jest.fn().mockReturnValue('mock-kid');
}
