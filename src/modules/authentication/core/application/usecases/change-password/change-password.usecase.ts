import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { SessionTokenRepository } from '../../../domain/repositories/session-token.repository';
import { SessionToken } from '../../../domain/entities/session-token';
import { PasswordHasher } from '../../../../../../shared-kernel/domain/interfaces/password-hasher.interface';
import { JwtSignerPort } from '../../ports/jwt-signer.port';
import { IdentityGateway } from '../../ports/identity.gateway';
import { AuthorizationGateway } from '../../ports/authorization.gateway';
import { CredentialRepository } from '../../../domain/repositories/credential.repository';
import { ChangePasswordCommand } from '../../commands/change-password.command';
import { AuthTokensResult } from '../../commands/results/auth-tokens.result';
import { RevokeAllForUserUsecase } from '../revoke-all-for-user/revoke-all-for-user.usecase';

@Injectable()
export class ChangePasswordUseCase extends UseCase<
  ChangePasswordCommand,
  AuthTokensResult,
  UseCaseError
> {
  private readonly logger = new Logger(ChangePasswordUseCase.name);

  constructor(
    private readonly identityGateway: IdentityGateway,
    private readonly authorizationGateway: AuthorizationGateway,
    private readonly credentialRepository: CredentialRepository,
    private readonly sessionTokenRepository: SessionTokenRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly jwtSignerService: JwtSignerPort,
    private readonly revokeAllForUserUsecase: RevokeAllForUserUsecase,
  ) {
    super();
  }

  async execute(
    command: ChangePasswordCommand,
  ): Promise<Result<AuthTokensResult, UseCaseError>> {
    if (command.newPassword === command.currentPassword) {
      return ErrorFactory.UseCaseError(
        'New password must differ from current password',
        null,
        HttpStatus.BAD_REQUEST,
      );
    }

    const credentialResult = await this.credentialRepository.findByUserId(
      command.userId,
    );

    if (credentialResult.isFailure) {
      return ErrorFactory.UseCaseError(
        'Failed to retrieve credential information',
        credentialResult.error,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const credential = credentialResult.value;

    if (!credential) {
      return ErrorFactory.UseCaseError(
        'Credential not found',
        null,
        HttpStatus.NOT_FOUND,
      );
    }

    const currentMatches = await this.passwordHasher.compare(
      command.currentPassword,
      credential.passwordHash,
    );

    if (!currentMatches) {
      return ErrorFactory.UseCaseError(
        'Current password is incorrect',
        null,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const sameAsCurrent = await this.passwordHasher.compare(
      command.newPassword,
      credential.passwordHash,
    );

    if (sameAsCurrent) {
      return ErrorFactory.UseCaseError(
        'New password must differ from current password',
        null,
        HttpStatus.BAD_REQUEST,
      );
    }

    const newHash = await this.passwordHasher.hash(command.newPassword);
    credential.changePassword(newHash);

    const updateResult = await this.credentialRepository.update(credential);
    if (updateResult.isFailure) {
      return ErrorFactory.UseCaseError(
        'Failed to update credential',
        updateResult.error,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const revokeResult = await this.revokeAllForUserUsecase.execute(
      command.userId,
    );
    if (revokeResult.isFailure) {
      return ErrorFactory.UseCaseError(
        'Failed to revoke existing sessions',
        revokeResult.error,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const userResult = await this.identityGateway.findUserById(command.userId);
    if (userResult.isFailure || !userResult.value) {
      return ErrorFactory.UseCaseError(
        'User not found',
        null,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = userResult.value;

    if (!user.isActive) {
      return ErrorFactory.UseCaseError(
        'User account is inactive',
        null,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const roleResult = await this.authorizationGateway.findRoleByUserId(
      user.id,
    );
    if (isFailure(roleResult)) {
      return ErrorFactory.UseCaseError(
        'Failed to resolve user role',
        roleResult.error,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!roleResult.value) {
      return ErrorFactory.UseCaseError(
        'User role not found',
        null,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const accessToken = await this.jwtSignerService.signAccessToken({
      sub: user.id.toString(),
      email: user.email,
      role: roleResult.value.code,
    });

    const {
      token: refreshToken,
      sessionId,
      expiresAt,
    } = await this.jwtSignerService.signRefreshTokenWithSession({
      sub: user.id,
    });

    const session = SessionToken.create(
      user.id,
      refreshToken,
      expiresAt,
      sessionId,
    );

    const saveResult = await this.sessionTokenRepository.save(session);
    if (saveResult.isFailure) {
      return ErrorFactory.UseCaseError(
        'Failed to create session',
        saveResult.error,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    this.logger.log(`User ${user.id} changed password successfully`);

    return Result.success<AuthTokensResult>({
      accessToken,
      refreshToken,
      mustChangePassword: false,
    });
  }
}
