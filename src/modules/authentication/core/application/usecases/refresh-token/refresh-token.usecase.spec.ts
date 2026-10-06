import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuthenticationDtoFactory,
  AuthorizationGatewayDtoFactory,
  AuthorizationGatewayMock,
  CredentialRepositoryMock,
  IdentityAccessGatewayDtoFactory,
  IdentityAccessGatewayMock,
} from 'src/modules/authentication/testing';
import {
  assertDefined,
  LoggerTestHelper,
  MockJwtSignerService,
  MockJwtVerifierService,
  ResultAssertionHelper,
} from 'src/testing';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';
import { RepositoryError } from 'src/shared-kernel/domain/exceptions/repository.error';
import { UseCaseError } from 'src/shared-kernel/domain/exceptions/usecase.error';
import { isFailure, isSuccess, Result } from 'src/shared-kernel/domain/result';
import { AuthorizationGateway } from '../../ports/authorization.gateway';
import { IdentityGateway } from '../../ports/identity.gateway';
import { JwtSignerPort } from '../../ports/jwt-signer.port';
import { JwtVerifierPort } from 'src/shared-kernel/domain/interfaces/jwt-verifier.port';
import { CredentialRepository } from '../../../domain/repositories/credential.repository';
import { SessionToken } from '../../../domain/entities/session-token';
import { SessionTokenRepository } from '../../../domain/repositories/session-token.repository';
import { RefreshTokenUseCase } from './refresh-token.usecase';

const SESSION_ID = 'session-id';
const RAW_TOKEN = 'refresh-token';
const NEXT_TOKEN = 'next-refresh-token';
const FUTURE = new Date('2099-01-01T00:00:00.000Z');
const NEXT_EXPIRY = new Date('2099-06-01T00:00:00.000Z');
const REUSE_MESSAGE = 'Refresh token reuse detected. All sessions revoked.';

class RecordingSessionTokenRepository implements SessionTokenRepository {
  readonly observedHashes: string[] = [];
  private readonly rows = new Map<string, SessionToken>();

  constructor(sessions: SessionToken[]) {
    for (const session of sessions) {
      this.rows.set(
        session.id,
        SessionToken.fromPrimitives(session.toPrimitives()),
      );
    }
  }

  save(session: SessionToken): Promise<Result<SessionToken, RepositoryError>> {
    const copy = SessionToken.fromPrimitives(session.toPrimitives());
    this.rows.set(session.id, copy);
    return Promise.resolve(
      Result.success(SessionToken.fromPrimitives(copy.toPrimitives())),
    );
  }

  findById(id: string): Promise<Result<SessionToken | null, RepositoryError>> {
    const stored = this.rows.get(id);
    if (!stored) {
      return Promise.resolve(Result.success(null));
    }
    this.observedHashes.push(stored.tokenHash);
    return Promise.resolve(
      Result.success(SessionToken.fromPrimitives(stored.toPrimitives())),
    );
  }

  replaceTokenIfCurrent(
    session: SessionToken,
    expectedTokenHash: string,
  ): Promise<Result<SessionToken, RepositoryError>> {
    const stored = this.rows.get(session.id);
    if (!stored || stored.isRevoked || stored.tokenHash !== expectedTokenHash) {
      return Promise.resolve(
        ErrorFactory.RepositoryError(
          'Refresh token was already rotated',
          undefined,
          HttpStatus.CONFLICT,
        ),
      );
    }

    const next = SessionToken.fromPrimitives(session.toPrimitives());
    this.rows.set(session.id, next);
    return Promise.resolve(
      Result.success(SessionToken.fromPrimitives(next.toPrimitives())),
    );
  }

  revokeAllForUser(userId: number): Promise<Result<void, RepositoryError>> {
    for (const [id, stored] of this.rows) {
      if (stored.userId !== userId || stored.isRevoked) {
        continue;
      }
      const revoked = SessionToken.fromPrimitives(stored.toPrimitives());
      revoked.revoke();
      this.rows.set(id, revoked);
    }
    return Promise.resolve(Result.success(undefined));
  }

  deleteExpired(): Promise<Result<number, RepositoryError>> {
    return Promise.resolve(Result.success(0));
  }
}

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let repository: RecordingSessionTokenRepository;
  let jwtVerifierService: MockJwtVerifierService;
  let jwtSignerService: MockJwtSignerService;
  let accessGateway: IdentityAccessGatewayMock;
  let authorizationGateway: AuthorizationGatewayMock;
  let credentialRepository: CredentialRepositoryMock;

  const presented = AuthenticationDtoFactory.buildSessionToken({
    id: SESSION_ID,
    userId: 1,
    rawToken: RAW_TOKEN,
    expiresAt: FUTURE,
  });

  beforeEach(() => {
    LoggerTestHelper.silence();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function build(sessions: SessionToken[]): Promise<void> {
    repository = new RecordingSessionTokenRepository(sessions);
    jwtVerifierService = new MockJwtVerifierService();
    jwtSignerService = new MockJwtSignerService();
    accessGateway = new IdentityAccessGatewayMock();
    authorizationGateway = new AuthorizationGatewayMock();
    credentialRepository = new CredentialRepositoryMock();

    jwtVerifierService.verifyRefreshToken.mockResolvedValue({
      sub: '1',
      sid: SESSION_ID,
      typ: 'refresh',
      iss: 'ecommerce-api',
      iat: 1_700_000_000,
      exp: 1_800_000_000,
    });
    jwtSignerService.signAccessToken.mockResolvedValue('new-access-token');
    jwtSignerService.signRefreshTokenWithSession.mockResolvedValue({
      token: NEXT_TOKEN,
      sessionId: SESSION_ID,
      expiresAt: NEXT_EXPIRY,
    });
    accessGateway.mockFindUserById(
      IdentityAccessGatewayDtoFactory.buildUserRecord({
        id: 1,
        email: 'user@example.com',
        isActive: true,
      }),
    );
    authorizationGateway.mockSuccessfulFindRoleByUserId(
      AuthorizationGatewayDtoFactory.buildRoleRecord({
        id: 2,
        code: 'CUSTOMER',
      }),
    );
    credentialRepository.mockSuccessfulFindByUserId(
      AuthenticationDtoFactory.buildPersistedCredentialEntity({
        userId: 1,
        passwordHash: 'hash',
        mustChangePassword: false,
      }),
    );

    const module = await Test.createTestingModule({
      providers: [
        RefreshTokenUseCase,
        { provide: JwtVerifierPort, useValue: jwtVerifierService },
        { provide: JwtSignerPort, useValue: jwtSignerService },
        { provide: SessionTokenRepository, useValue: repository },
        { provide: IdentityGateway, useValue: accessGateway },
        { provide: AuthorizationGateway, useValue: authorizationGateway },
        { provide: CredentialRepository, useValue: credentialRepository },
      ],
    }).compile();

    useCase = module.get(RefreshTokenUseCase);
  }

  it('returns a new pair and keeps the same session when the token matches', async () => {
    await build([presented]);
    const revokeAllForUser = jest.spyOn(repository, 'revokeAllForUser');

    const result = await useCase.execute(RAW_TOKEN);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.accessToken).toBe('new-access-token');
    expect(result.value.refreshToken).toBe(NEXT_TOKEN);
    expect(result.value.mustChangePassword).toBe(false);
    expect(jwtSignerService.signRefreshTokenWithSession).toHaveBeenCalledWith({
      sub: 1,
      sid: SESSION_ID,
    });
    expect(revokeAllForUser).not.toHaveBeenCalled();

    const stored = await repository.findById(SESSION_ID);
    ResultAssertionHelper.assertResultSuccess(stored);
    assertDefined(stored.value);
    expect(stored.value.id).toBe(SESSION_ID);
    expect(stored.value.isRevoked).toBe(false);
    expect(stored.value.isTokenMatch(RAW_TOKEN)).toBe(false);
    expect(stored.value.isTokenMatch(NEXT_TOKEN)).toBe(true);
  });

  it('revokes every session when a rotated token is presented again', async () => {
    const otherDevice = AuthenticationDtoFactory.buildSessionToken({
      id: 'other-session',
      userId: 1,
      rawToken: 'other-device-token',
      expiresAt: FUTURE,
    });
    const someoneElse = AuthenticationDtoFactory.buildSessionToken({
      id: 'admin-session',
      userId: 2,
      rawToken: 'admin-token',
      expiresAt: FUTURE,
    });
    await build([presented, otherDevice, someoneElse]);
    const revokeAllForUser = jest.spyOn(repository, 'revokeAllForUser');

    const rotated = await useCase.execute(RAW_TOKEN);
    ResultAssertionHelper.assertResultSuccess(rotated);

    const replay = await useCase.execute(RAW_TOKEN);

    ResultAssertionHelper.assertResultFailure(
      replay,
      REUSE_MESSAGE,
      UseCaseError,
    );
    expect(replay.error.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    expect(revokeAllForUser).toHaveBeenCalledTimes(1);
    expect(revokeAllForUser).toHaveBeenCalledWith(1);

    const stored = await repository.findById(SESSION_ID);
    const other = await repository.findById('other-session');
    const admin = await repository.findById('admin-session');
    ResultAssertionHelper.assertResultSuccess(stored);
    ResultAssertionHelper.assertResultSuccess(other);
    ResultAssertionHelper.assertResultSuccess(admin);
    assertDefined(stored.value);
    assertDefined(other.value);
    assertDefined(admin.value);
    expect(stored.value.isRevoked).toBe(true);
    expect(stored.value.isTokenMatch(NEXT_TOKEN)).toBe(true);
    expect(other.value.isRevoked).toBe(true);
    expect(admin.value.isRevoked).toBe(false);

    const nextAttempt = await useCase.execute(NEXT_TOKEN);
    ResultAssertionHelper.assertResultFailure(
      nextAttempt,
      'Invalid or expired session',
      UseCaseError,
    );
    expect(revokeAllForUser).toHaveBeenCalledTimes(1);
  });

  it('returns one success when two refreshes present the same token', async () => {
    await build([presented]);

    const results = await Promise.all([
      useCase.execute(RAW_TOKEN),
      useCase.execute(RAW_TOKEN),
    ]);

    const successes = results.filter(isSuccess);
    const failures = results.filter(isFailure);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(repository.observedHashes.slice(0, 2)).toEqual([
      presented.tokenHash,
      presented.tokenHash,
    ]);
    const failure = failures[0];
    assertDefined(failure);
    ResultAssertionHelper.assertResultFailure(
      failure,
      REUSE_MESSAGE,
      UseCaseError,
    );
  });

  it('returns unauthorized when the session is revoked', async () => {
    const revoked = AuthenticationDtoFactory.buildSessionToken({
      id: SESSION_ID,
      userId: 1,
      rawToken: RAW_TOKEN,
      expiresAt: FUTURE,
    });
    revoked.revoke();
    await build([revoked]);
    const revokeAllForUser = jest.spyOn(repository, 'revokeAllForUser');

    const result = await useCase.execute(RAW_TOKEN);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Invalid or expired session',
      UseCaseError,
    );
    expect(revokeAllForUser).not.toHaveBeenCalled();
    expect(jwtSignerService.signRefreshTokenWithSession).not.toHaveBeenCalled();
  });

  it('returns unauthorized when the session is expired', async () => {
    const expired = AuthenticationDtoFactory.buildSessionToken({
      id: SESSION_ID,
      userId: 1,
      rawToken: RAW_TOKEN,
      expiresAt: new Date('2000-01-01T00:00:00.000Z'),
    });
    await build([expired]);
    const revokeAllForUser = jest.spyOn(repository, 'revokeAllForUser');

    const result = await useCase.execute(RAW_TOKEN);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Invalid or expired session',
      UseCaseError,
    );
    expect(revokeAllForUser).not.toHaveBeenCalled();
    expect(jwtSignerService.signRefreshTokenWithSession).not.toHaveBeenCalled();
  });

  it('returns unauthorized when the session is missing', async () => {
    await build([]);
    const revokeAllForUser = jest.spyOn(repository, 'revokeAllForUser');

    const result = await useCase.execute(RAW_TOKEN);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Session not found',
      UseCaseError,
    );
    expect(revokeAllForUser).not.toHaveBeenCalled();
  });

  it('returns the repository failure when the session cannot be loaded', async () => {
    await build([presented]);
    jest
      .spyOn(repository, 'findById')
      .mockResolvedValue(
        ErrorFactory.RepositoryError(
          'db down',
          new Error('db down'),
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );

    const result = await useCase.execute(RAW_TOKEN);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to load session',
      UseCaseError,
    );
    expect(result.error.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(result.error.retryable).toBe(true);
  });

  it('returns unauthorized when the refresh token signature is invalid', async () => {
    await build([presented]);
    jwtVerifierService.verifyRefreshToken.mockRejectedValue(
      new Error('bad signature'),
    );

    const result = await useCase.execute(RAW_TOKEN);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Invalid refresh token',
      UseCaseError,
    );
  });

  it('returns unauthorized when the user is missing and leaves the token usable', async () => {
    await build([presented]);
    accessGateway.mockFindUserById(null);

    const result = await useCase.execute(RAW_TOKEN);

    ResultAssertionHelper.assertResultFailure(
      result,
      'User not found',
      UseCaseError,
    );
    const stored = await repository.findById(SESSION_ID);
    ResultAssertionHelper.assertResultSuccess(stored);
    assertDefined(stored.value);
    expect(stored.value.isTokenMatch(RAW_TOKEN)).toBe(true);
    expect(jwtSignerService.signRefreshTokenWithSession).not.toHaveBeenCalled();
  });

  it('preserves retryable when the user lookup fails', async () => {
    await build([presented]);
    accessGateway.mockFindUserByIdError('directory down');

    const result = await useCase.execute(RAW_TOKEN);

    ResultAssertionHelper.assertResultFailure(
      result,
      'User not found',
      UseCaseError,
    );
    expect(result.error.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(result.error.retryable).toBe(true);
  });

  it('returns unauthorized when the role is missing and leaves the token usable', async () => {
    await build([presented]);
    authorizationGateway.mockSuccessfulFindRoleByUserId(null);

    const result = await useCase.execute(RAW_TOKEN);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to resolve user role',
      UseCaseError,
    );
    const stored = await repository.findById(SESSION_ID);
    ResultAssertionHelper.assertResultSuccess(stored);
    assertDefined(stored.value);
    expect(stored.value.isTokenMatch(RAW_TOKEN)).toBe(true);
  });

  it('preserves retryable when the role lookup fails', async () => {
    await build([presented]);
    authorizationGateway.mockFailedFindRoleByUserId('roles down');

    const result = await useCase.execute(RAW_TOKEN);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to resolve user role',
      UseCaseError,
    );
    expect(result.error.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(result.error.retryable).toBe(true);
  });

  it('preserves retryable when the credential lookup fails', async () => {
    await build([presented]);
    credentialRepository.mockFailedFindByUserId('credentials down');

    const result = await useCase.execute(RAW_TOKEN);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to retrieve credential information',
      UseCaseError,
    );
    expect(result.error.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(result.error.retryable).toBe(true);
    const stored = await repository.findById(SESSION_ID);
    ResultAssertionHelper.assertResultSuccess(stored);
    assertDefined(stored.value);
    expect(stored.value.isTokenMatch(RAW_TOKEN)).toBe(true);
  });

  it('preserves retryable when rotation fails for a reason other than conflict', async () => {
    await build([presented]);
    jest
      .spyOn(repository, 'replaceTokenIfCurrent')
      .mockResolvedValue(
        ErrorFactory.RepositoryError(
          'db down',
          new Error('db down'),
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );

    const result = await useCase.execute(RAW_TOKEN);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to rotate refresh token',
      UseCaseError,
    );
    expect(result.error.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(result.error.retryable).toBe(true);
    const stored = await repository.findById(SESSION_ID);
    ResultAssertionHelper.assertResultSuccess(stored);
    assertDefined(stored.value);
    expect(stored.value.isTokenMatch(RAW_TOKEN)).toBe(true);
  });

  it('preserves retryable when revoking sessions after reuse fails', async () => {
    await build([presented]);
    const rotated = await useCase.execute(RAW_TOKEN);
    ResultAssertionHelper.assertResultSuccess(rotated);
    jest
      .spyOn(repository, 'revokeAllForUser')
      .mockResolvedValue(
        ErrorFactory.RepositoryError(
          'db down',
          new Error('db down'),
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );

    const replay = await useCase.execute(RAW_TOKEN);

    ResultAssertionHelper.assertResultFailure(
      replay,
      'Failed to revoke sessions after refresh token reuse',
      UseCaseError,
    );
    expect(replay.error.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(replay.error.retryable).toBe(true);
  });

  it('returns unauthorized without revoking others when logout wins the rotation race', async () => {
    await build([presented]);
    const revoked = AuthenticationDtoFactory.buildSessionToken({
      id: SESSION_ID,
      userId: 1,
      rawToken: RAW_TOKEN,
      expiresAt: FUTURE,
    });
    revoked.revoke();
    let reads = 0;
    jest.spyOn(repository, 'findById').mockImplementation(() => {
      reads += 1;
      const session = reads === 1 ? presented : revoked;
      return Promise.resolve(
        Result.success(SessionToken.fromPrimitives(session.toPrimitives())),
      );
    });
    jest
      .spyOn(repository, 'replaceTokenIfCurrent')
      .mockResolvedValue(
        ErrorFactory.RepositoryError(
          'Refresh token was already rotated',
          undefined,
          HttpStatus.CONFLICT,
        ),
      );
    const revokeAllForUser = jest.spyOn(repository, 'revokeAllForUser');

    const result = await useCase.execute(RAW_TOKEN);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Invalid or expired session',
      UseCaseError,
    );
    expect(revokeAllForUser).not.toHaveBeenCalled();
  });

  it('preserves retryable when the session cannot be reloaded after a conflict', async () => {
    await build([presented]);
    let reads = 0;
    jest.spyOn(repository, 'findById').mockImplementation(() => {
      reads += 1;
      if (reads === 1) {
        return Promise.resolve(
          Result.success(SessionToken.fromPrimitives(presented.toPrimitives())),
        );
      }
      return Promise.resolve(
        ErrorFactory.RepositoryError(
          'db down',
          new Error('db down'),
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );
    });
    jest
      .spyOn(repository, 'replaceTokenIfCurrent')
      .mockResolvedValue(
        ErrorFactory.RepositoryError(
          'Refresh token was already rotated',
          undefined,
          HttpStatus.CONFLICT,
        ),
      );

    const result = await useCase.execute(RAW_TOKEN);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to load session',
      UseCaseError,
    );
    expect(result.error.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(result.error.retryable).toBe(true);
  });
});
