import { RefreshTokenUseCase } from './refresh-token.usecase';
import { MockJwtVerifierService } from '../../../../../../testing/mocks/jwt-verifier.service.mock';
import { MockJwtSignerService } from '../../../../../../testing/mocks/jwt-signer.service.mock';
import { MockSessionTokenRepository } from '../../../../testing/mocks/session-token-repository.mock';
import { MockUserRepository } from '../../../../testing/mocks/user-repository.mock';
import { SessionToken } from '../../../domain/entities/session-token';
import { User } from '../../../domain/entities/user';
import { UserTestFactory } from '../../../../testing/factories/user.factory';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';

describe('RefreshTokenUseCase', () => {
  let usecase: RefreshTokenUseCase;
  let jwtVerifierService: MockJwtVerifierService;
  let jwtSignerService: MockJwtSignerService;
  let sessionTokenRepository: MockSessionTokenRepository;
  let userRepository: MockUserRepository;

  beforeEach(() => {
    jwtVerifierService = new MockJwtVerifierService();
    jwtSignerService = new MockJwtSignerService();
    sessionTokenRepository = new MockSessionTokenRepository();
    userRepository = new MockUserRepository();

    usecase = new RefreshTokenUseCase(
      jwtVerifierService as any,
      jwtSignerService as any,
      sessionTokenRepository,
      userRepository,
    );
  });

  afterEach(() => {
    sessionTokenRepository.reset();
    userRepository.reset();
  });

  it('should refresh token successfully', async () => {
    const dummyPayload = Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    ).toString('base64url');
    const rawToken = `header.${dummyPayload}.signature`;
    const sessionId = 'mock-session-id';

    // Mock the JWT verifier payload
    jwtVerifierService.verifyRefreshToken.mockResolvedValue({
      sub: 1,
      sessionId: sessionId,
      typ: 'refresh',
    });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    const session = SessionToken.create(1, rawToken, expiresAt, sessionId);
    sessionTokenRepository.findById.mockResolvedValue(Result.success(session));
    sessionTokenRepository.save.mockResolvedValue(Result.success(session));

    const mockUser = User.fromPrimitives(UserTestFactory.createMockUser());
    userRepository.findById.mockResolvedValue(Result.success(mockUser));

    const newAccessToken = 'new-access-token';
    const newRefreshToken = 'new-refresh-token';
    jwtSignerService.signAccessToken.mockResolvedValue(newAccessToken);
    jwtSignerService.signRefreshTokenWithSession.mockResolvedValue({
      token: newRefreshToken,
      sessionId: 'new-session-id',
      expiresAt: new Date(Date.now() + 3600_000),
    });

    const result = await usecase.execute({ refreshToken: rawToken });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(session.isRevoked).toBe(true);
    expect(result.value.accessToken).toBe(newAccessToken);
    expect(result.value.refreshToken).toBe(newRefreshToken);
  });

  it('should return failure if session is revoked', async () => {
    const rawToken = `header.e30.signature`;
    const sessionId = 'mock-session-id';

    jwtVerifierService.verifyRefreshToken.mockResolvedValue({
      sub: 1,
      sessionId,
    });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    const session = SessionToken.create(1, rawToken, expiresAt, sessionId);
    session.revoke();
    sessionTokenRepository.findById.mockResolvedValue(Result.success(session));

    const result = await usecase.execute({ refreshToken: rawToken });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Invalid or expired session',
      UseCaseError,
    );
  });
});
