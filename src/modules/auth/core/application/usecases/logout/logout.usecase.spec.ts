import { LogoutUseCase } from './logout.usecase';
import { MockJwtVerifierService } from '../../../../../../testing/mocks/jwt-verifier.service.mock';
import { MockSessionTokenRepository } from '../../../../testing/mocks/session-token-repository.mock';
import { SessionToken } from '../../../domain/entities/session-token';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Result } from '../../../../../../shared-kernel/domain/result';

describe('LogoutUseCase', () => {
  let usecase: LogoutUseCase;
  let jwtVerifierService: MockJwtVerifierService;
  let sessionTokenRepository: MockSessionTokenRepository;

  beforeEach(() => {
    jwtVerifierService = new MockJwtVerifierService();
    sessionTokenRepository = new MockSessionTokenRepository();

    usecase = new LogoutUseCase(
      jwtVerifierService as any,
      sessionTokenRepository,
    );
  });

  it('should revoke a session successfully', async () => {
    const rawToken = `header.payload.signature`;
    const sessionId = 'mock-session-id';

    jwtVerifierService.verifyRefreshToken.mockResolvedValue({
      sessionId: sessionId,
    });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    const session = SessionToken.create(1, rawToken, expiresAt, sessionId);
    sessionTokenRepository.findById.mockResolvedValue(Result.success(session));
    sessionTokenRepository.save.mockResolvedValue(Result.success(session));

    const result = await usecase.execute({ refreshToken: rawToken });

    ResultAssertionHelper.assertResultSuccess(result);
    // The session should be revoked
    expect(session.isRevoked).toBe(true);
    expect(sessionTokenRepository.save).toHaveBeenCalledWith(session);
  });

  it('should be idempotent if session not found', async () => {
    jwtVerifierService.verifyRefreshToken.mockResolvedValue({
      sessionId: 'unknown',
    });
    sessionTokenRepository.findById.mockResolvedValue(Result.success(null));

    const result = await usecase.execute({ refreshToken: 'foo' });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(sessionTokenRepository.save).not.toHaveBeenCalled();
  });
});
