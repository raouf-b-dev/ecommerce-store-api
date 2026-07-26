import { LogoutUseCase } from './logout.usecase';
import { MockSessionTokenRepository } from '../../../../testing/mocks/session-token-repository.mock';
import { SessionToken } from '../../../domain/entities/session-token';
import {
  MockJwtVerifierService,
  ResultAssertionHelper,
} from '../../../../../../testing';
import { Result } from '../../../../../../shared-kernel/domain/result';

describe('LogoutUseCase', () => {
  let usecase: LogoutUseCase;
  let jwtVerifierService: MockJwtVerifierService;
  let sessionTokenRepository: MockSessionTokenRepository;

  beforeEach(() => {
    jwtVerifierService = new MockJwtVerifierService();
    sessionTokenRepository = new MockSessionTokenRepository();

    usecase = new LogoutUseCase(jwtVerifierService, sessionTokenRepository);
  });

  it('should revoke a session successfully', async () => {
    const rawToken = `header.payload.signature`;
    const sessionId = 'mock-session-id';

    jwtVerifierService.verifyRefreshToken.mockResolvedValue({
      sub: '1',
      sessionId: sessionId,
      typ: 'Refresh',
      iss: 'test-issuer',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
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
      sub: '1',
      sessionId: 'unknown',
      typ: 'Refresh',
      iss: 'test-issuer',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
    });
    sessionTokenRepository.findById.mockResolvedValue(Result.success(null));

    const result = await usecase.execute({ refreshToken: 'foo' });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(sessionTokenRepository.save).not.toHaveBeenCalled();
  });
});
