import { LogoutAllUseCase } from './logout-all.usecase';
import { MockJwtVerifierService } from '../../../../../../testing/mocks/jwt-verifier.service.mock';
import { MockSessionTokenRepository } from '../../../../testing/mocks/session-token-repository.mock';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Result } from '../../../../../../shared-kernel/domain/result';

describe('LogoutAllUseCase', () => {
  let usecase: LogoutAllUseCase;
  let jwtVerifierService: MockJwtVerifierService;
  let sessionTokenRepository: MockSessionTokenRepository;

  beforeEach(() => {
    jwtVerifierService = new MockJwtVerifierService();
    sessionTokenRepository = new MockSessionTokenRepository();

    usecase = new LogoutAllUseCase(
      jwtVerifierService as any,
      sessionTokenRepository,
    );
  });

  it('should revoke all sessions for user successfully', async () => {
    const userId = 123;

    jwtVerifierService.verifyRefreshToken.mockResolvedValue({
      sub: userId,
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
