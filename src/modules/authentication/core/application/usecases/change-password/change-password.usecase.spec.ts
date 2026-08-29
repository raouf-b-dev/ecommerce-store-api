import {
  AuthenticationDtoFactory,
  AuthorizationGatewayMock,
  CredentialRepositoryMock,
  IdentityAccessGatewayMock,
  IdentityAccessGatewayDtoFactory,
  MockPasswordHasher,
  MockRevokeAllForUserUsecase,
  MockSessionTokenRepository,
} from 'src/modules/authentication/testing';
import { MockJwtSignerService, ResultAssertionHelper } from 'src/testing';
import { ChangePasswordUseCase } from './change-password.usecase';
import { Credential } from '../../../domain/entities/credential';
import { isFailure } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { HttpStatus } from '@nestjs/common';

describe('ChangePasswordUseCase', () => {
  let useCase: ChangePasswordUseCase;
  let identityGateway: IdentityAccessGatewayMock;
  let authorizationGateway: AuthorizationGatewayMock;
  let credentialRepository: CredentialRepositoryMock;
  let sessionTokenRepository: MockSessionTokenRepository;
  let passwordHasher: MockPasswordHasher;
  let jwtSignerService: MockJwtSignerService;
  let revokeAllForUserUsecase: MockRevokeAllForUserUsecase;

  const userId = 42;
  let credential: Credential;

  beforeEach(() => {
    identityGateway = new IdentityAccessGatewayMock();
    authorizationGateway = new AuthorizationGatewayMock();
    credentialRepository = new CredentialRepositoryMock();
    sessionTokenRepository = new MockSessionTokenRepository();
    passwordHasher = new MockPasswordHasher();
    jwtSignerService = new MockJwtSignerService();
    revokeAllForUserUsecase = new MockRevokeAllForUserUsecase();

    credential = AuthenticationDtoFactory.buildPersistedCredentialEntity({
      userId,
      passwordHash: 'hashed-old',
      mustChangePassword: true,
    });

    useCase = new ChangePasswordUseCase(
      identityGateway,
      authorizationGateway,
      credentialRepository,
      sessionTokenRepository,
      passwordHasher,
      jwtSignerService,
      revokeAllForUserUsecase as never,
    );

    credentialRepository.mockSuccessfulFindByUserId(credential);
    credentialRepository.mockSuccessfulUpdate();
    identityGateway.mockFindUserById(
      IdentityAccessGatewayDtoFactory.buildUserRecord({
        id: userId,
        email: 'user@example.com',
        isActive: true,
      }),
    );
    authorizationGateway.mockSuccessfulFindRoleByUserId({
      id: 1,
      code: 'ADMIN',
    });
    passwordHasher.compare
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    passwordHasher.hash.mockResolvedValue('hashed-new');
    jwtSignerService.signAccessToken.mockResolvedValue('access-token');
    jwtSignerService.signRefreshTokenWithSession.mockResolvedValue({
      token: 'refresh-token',
      sessionId: 'session-id',
      expiresAt: new Date(Date.now() + 3600_000),
    });
    revokeAllForUserUsecase.mockSuccessfulExecute();
    sessionTokenRepository.mockSuccessfulSave(
      AuthenticationDtoFactory.buildSessionToken({ userId }),
    );
  });

  it('changes password, revokes sessions, and returns tokens with flag cleared', async () => {
    const result = await useCase.execute({
      userId,
      currentPassword: 'OldPass1!',
      newPassword: 'NewPass2!',
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.mustChangePassword).toBe(false);
    expect(result.value.accessToken).toBe('access-token');
    expect(revokeAllForUserUsecase.execute).toHaveBeenCalledWith(userId);
    expect(credentialRepository.update).toHaveBeenCalled();
    expect(credential.mustChangePassword).toBe(false);
  });

  it('returns unauthorized when current password is wrong', async () => {
    passwordHasher.compare.mockReset();
    passwordHasher.compare.mockResolvedValue(false);

    const result = await useCase.execute({
      userId,
      currentPassword: 'wrong',
      newPassword: 'NewPass2!',
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Current password is incorrect',
      UseCaseError,
    );
    const error = isFailure(result) ? result.error : undefined;
    expect(error?.statusCode).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('returns bad request when new password equals current password string', async () => {
    const result = await useCase.execute({
      userId,
      currentPassword: 'SamePass1!',
      newPassword: 'SamePass1!',
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'New password must differ from current password',
      UseCaseError,
    );
    const error = isFailure(result) ? result.error : undefined;
    expect(error?.statusCode).toBe(HttpStatus.BAD_REQUEST);
  });
});
