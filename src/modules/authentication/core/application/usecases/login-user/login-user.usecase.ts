import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { SessionTokenRepository } from '../../../domain/repositories/session-token.repository';
import { SessionToken } from '../../../domain/entities/session-token';
import { PasswordHasher } from '../../../../../../shared-kernel/domain/interfaces/password-hasher.interface';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';
import { JwtSignerPort } from '../../ports/jwt-signer.port';
import { IdentityGateway } from '../../ports/identity.gateway';
import { AuthorizationGateway } from '../../ports/authorization.gateway';
import { CredentialRepository } from '../../../domain/repositories/credential.repository';

export interface LoginCommand {
  email: string;
  password: string;
}

@Injectable()
export class LoginUserUseCase extends UseCase<
  LoginCommand,
  { accessToken: string; refreshToken: string },
  UseCaseError
> {
  private readonly logger = new Logger(LoginUserUseCase.name);

  constructor(
    private readonly identityGateway: IdentityGateway,
    private readonly authorizationGateway: AuthorizationGateway,
    private readonly credentialRepository: CredentialRepository,
    private readonly sessionTokenRepository: SessionTokenRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly jwtSignerService: JwtSignerPort,
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {
    super();
  }

  async execute(
    command: LoginCommand,
  ): Promise<
    Result<{ accessToken: string; refreshToken: string }, UseCaseError>
  > {
    // 1. Find User Identity
    const userResult = await this.identityGateway.findUserByEmail(
      command.email,
    );

    if (userResult.isFailure) {
      return ErrorFactory.UseCaseError(
        'Failed to retrieve user information',
        userResult.error,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const user = userResult.value;

    if (!user) {
      this.domainEventPublisher.publish('auth.login.failure', {
        reason: 'invalid_user',
      });
      return ErrorFactory.UseCaseError(
        'Invalid credentials',
        null,
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 2. Check if user is active
    if (!user.isActive) {
      this.domainEventPublisher.publish('auth.login.failure', {
        reason: 'inactive_user',
      });
      return ErrorFactory.UseCaseError(
        'Invalid credentials',
        null,
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 3. Find Credential by UserId & Verify Password
    const credentialResult = await this.credentialRepository.findByUserId(
      user.id,
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
      this.domainEventPublisher.publish('auth.login.failure', {
        reason: 'invalid_credential',
      });
      return ErrorFactory.UseCaseError(
        'Invalid credentials',
        null,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const isMatch = await this.passwordHasher.compare(
      command.password,
      credential.passwordHash,
    );
    if (!isMatch) {
      this.domainEventPublisher.publish('auth.login.failure', {
        reason: 'invalid_password',
      });
      return ErrorFactory.UseCaseError(
        'Invalid credentials',
        null,
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 4. Resolve role code for JWT payload (PermissionsGuard requires the string code)
    const roleResult = await this.authorizationGateway.findRoleByUserId(
      user.id,
    );
    if (roleResult.isFailure) {
      this.domainEventPublisher.publish('auth.login.failure', {
        reason: 'role_resolution_failed',
      });
      return ErrorFactory.UseCaseError(
        'Failed to resolve user role',
        roleResult.error,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!roleResult.value) {
      this.domainEventPublisher.publish('auth.login.failure', {
        reason: 'role_not_found',
      });
      return ErrorFactory.UseCaseError(
        'User role not found',
        null,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // 5. Generate Access Token
    const accessToken = await this.jwtSignerService.signAccessToken({
      sub: user.id,
      email: user.email,
      role: roleResult.value.code,
    });

    // 6. Generate Refresh Token
    const {
      token: refreshToken,
      sessionId,
      expiresAt,
    } = await this.jwtSignerService.signRefreshTokenWithSession({
      sub: user.id,
    });

    // 7. Save Session
    const session = SessionToken.create(
      user.id,
      refreshToken,
      expiresAt,
      sessionId,
    );

    const saveResult = await this.sessionTokenRepository.save(session);
    if (saveResult.isFailure) {
      return ErrorFactory.UseCaseError('Failed to create session');
    }

    this.logger.log(`User ${command.email} logged in successfully`);
    this.domainEventPublisher.publish('auth.login.success', {
      userId: user.id,
    });

    return Result.success({ accessToken, refreshToken });
  }
}
