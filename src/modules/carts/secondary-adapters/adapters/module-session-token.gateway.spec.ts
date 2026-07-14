import { JwtSignerPort } from 'src/modules/auth/core/application/ports/jwt-signer.port.js';
import { JwtVerifierPort } from 'src/shared-kernel/domain/interfaces/jwt-verifier.port.js';
import { ModuleCartSessionTokenGateway } from './module-session-token.gateway';
import { ResultAssertionHelper } from '../../../../testing/helpers/result-assertion.helper';

describe('ModuleCartSessionTokenGateway', () => {
  let service: ModuleCartSessionTokenGateway;
  let mockSignerPort: jest.Mocked<JwtSignerPort>;
  let mockVerifierPort: jest.Mocked<JwtVerifierPort>;

  beforeEach(() => {
    mockSignerPort = {
      signAccessToken: jest.fn(),
      signRefreshToken: jest.fn(),
      signRefreshTokenWithSession: jest.fn(),
      signCartSessionToken: jest.fn(),
    } as any;

    mockVerifierPort = {
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
      verifyCartSessionToken: jest.fn(),
    } as any;

    service = new ModuleCartSessionTokenGateway(
      mockSignerPort,
      mockVerifierPort,
    );
  });

  describe('generateToken', () => {
    it('should call jwtSignerPort.signCartSessionToken and return the token', async () => {
      mockSignerPort.signCartSessionToken.mockResolvedValue('mock-jwt-token');

      const result = await service.generateToken(123);

      expect(mockSignerPort.signCartSessionToken).toHaveBeenCalledWith(123);
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBe('mock-jwt-token');
    });
  });

  describe('validateToken', () => {
    it('should return true when token is valid and cartId matches', async () => {
      mockVerifierPort.verifyCartSessionToken.mockResolvedValue({
        sub: 'guest',
        cartId: 123,
        typ: 'cart_session',
        iss: 'ecommerce-api',
        iat: 123456789,
        exp: 123456789 + 3600,
      });

      const result = await service.validateToken('valid-token', 123);

      expect(mockVerifierPort.verifyCartSessionToken).toHaveBeenCalledWith(
        'valid-token',
      );
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBe(true);
    });

    it('should return false when token is valid but cartId mismatches', async () => {
      mockVerifierPort.verifyCartSessionToken.mockResolvedValue({
        sub: 'guest',
        cartId: 999, // mismatched cartId
        typ: 'cart_session',
        iss: 'ecommerce-api',
        iat: 123456789,
        exp: 123456789 + 3600,
      });

      const result = await service.validateToken('valid-token', 123);

      expect(mockVerifierPort.verifyCartSessionToken).toHaveBeenCalledWith(
        'valid-token',
      );
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBe(false);
    });

    it('should return false when token verification throws an error', async () => {
      mockVerifierPort.verifyCartSessionToken.mockRejectedValue(
        new Error('Invalid signature'),
      );

      const result = await service.validateToken('invalid-token', 123);

      expect(mockVerifierPort.verifyCartSessionToken).toHaveBeenCalledWith(
        'invalid-token',
      );
      ResultAssertionHelper.assertResultFailure(result);
    });
  });
});
