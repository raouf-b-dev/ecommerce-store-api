import { LogoutAllUseCase } from './logout-all.usecase';
import { MockSessionTokenRepository } from '../../../../testing/mocks/session-token-repository.mock';
import {
  MockJwtVerifierService,
  ResultAssertionHelper,
} from '../../../../../../testing';
import { Result } from '../../../../../../shared-kernel/domain/result';

describe('LogoutAllUseCase', () => {
  let usecase: LogoutAllUseCase;
  let jwtVerifierService: MockJwtVerifierService;
  let sessionTokenRepository: MockSessionTokenRepository;

  beforeEach(() => {
    jwtVerifierService = new MockJwtVerifierService();
    sessionTokenRepository = new MockSessionTokenRepository();

    usecase = new LogoutAllUseCase(jwtVerifierService, sessionTokenRepository);
  });

  it('should revoke all sessions for user successfully', async () => {
    const userId = 123;

    jwtVerifierService.verifyRefreshToken.mockResolvedValue({
      sub: String(userId),
      sessionId: 'mock-session-id',
      typ: 'Refresh',
      iss: 'test-issuer',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
    });

    sessionTokenRepository.revokeAllForUser.mockResolvedValue(
      Result.success(undefined),
    );

    const result = await usecase.execute({ refreshToken: 'dummy-token' });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(sessionTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
      userId,
    );
  });
});
