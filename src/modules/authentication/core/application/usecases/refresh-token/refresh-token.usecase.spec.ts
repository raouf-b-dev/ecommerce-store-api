import { RefreshTokenUseCase } from './refresh-token.usecase';
import { MockJwtSignerService } from '../../../../../../testing/mocks/jwt-signer.service.mock';
import { MockSessionTokenRepository } from '../../../../testing/mocks/session-token-repository.mock';
import { SessionToken } from '../../../domain/entities/session-token';
import {
  MockJwtVerifierService,
  ResultAssertionHelper,
  LoggerTestHelper,
} from '../../../../../../testing';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { IdentityAccessGatewayMock } from '../../../../testing/mocks/identity-access-gateway.mock';

describe('RefreshTokenUseCase', () => {
  let usecase: RefreshTokenUseCase;
  let jwtVerifierService: MockJwtVerifierService;
  let jwtSignerService: MockJwtSignerService;
  let sessionTokenRepository: MockSessionTokenRepository;
  let accessGateway: IdentityAccessGatewayMock;

  beforeEach(() => {
    LoggerTestHelper.silence();

    jwtVerifierService = new MockJwtVerifierService();
    jwtSignerService = new MockJwtSignerService();
    sessionTokenRepository = new MockSessionTokenRepository();
    accessGateway = new IdentityAccessGatewayMock();

    usecase = new RefreshTokenUseCase(
      jwtVerifierService,
      jwtSignerService,
      sessionTokenRepository,
      accessGateway,
    );
  });

  afterEach(() => {
    sessionTokenRepository.reset();
    accessGateway.reset();
    jest.restoreAllMocks();
  });

  it('should refresh token successfully', async () => {
    const dummyPayload = Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    ).toString('base64url');
    const rawToken = `header.${dummyPayload}.signature`;
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

    accessGateway.mockSuccessfulFindById({
      id: 1,
      email: 'user@example.com',
      passwordHash: 'hashed',
      isActive: true,
      roleId: 2,
    });
    accessGateway.mockSuccessfulFindRoleById({ id: 2, code: 'CUSTOMER' });

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
      sub: '1',
      sessionId,
      typ: 'Refresh',
      iss: 'test-issuer',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
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

  it('should revoke all sessions when token reuse is detected', async () => {
    const rawToken = `header.payload.signature`;
    const differentToken = `header.different.signature`;
    const sessionId = 'mock-session-id';

    jwtVerifierService.verifyRefreshToken.mockResolvedValue({
      sub: '1',
      sessionId,
      typ: 'Refresh',
      iss: 'test-issuer',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
    });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    const session = SessionToken.create(
      1,
      differentToken,
      expiresAt,
      sessionId,
    );
    sessionTokenRepository.findById.mockResolvedValue(Result.success(session));
    sessionTokenRepository.revokeAllForUser.mockResolvedValue(
      Result.success(undefined),
    );

    const result = await usecase.execute({ refreshToken: rawToken });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Refresh token reuse detected. All sessions revoked.',
      UseCaseError,
    );
    expect(sessionTokenRepository.revokeAllForUser).toHaveBeenCalledWith(1);
  });
});
