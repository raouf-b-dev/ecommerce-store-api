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
import { IdentityAccessGateway } from '../../ports/access.gateway';

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
    private readonly identityAccessGateway: IdentityAccessGateway,
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
    // 1. Find User
    const userResult = await this.identityAccessGateway.findCredentialsByEmail(
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

    // 2. Verify Password
    const isMatch = await this.passwordHasher.compare(
      command.password,
      user.passwordHash,
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

    // 2.5 Check if user is active
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

    // 3. Resolve role code for JWT payload (PermissionsGuard requires the string code)
    if (!user.roleId) {
      this.domainEventPublisher.publish('auth.login.failure', {
        reason: 'no_role',
      });
      return ErrorFactory.UseCaseError(
        'User has no assigned role',
        null,
        HttpStatus.FORBIDDEN,
      );
    }
    const roleResult = await this.identityAccessGateway.findRoleById(
      user.roleId,
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

    // 4. Generate Access Token
    const accessToken = await this.jwtSignerService.signAccessToken({
      sub: user.id,
      email: user.email,
      role: roleResult.value.code,
    });

    // 4. Generate Refresh Token (JwtSignerService handles sessionId generation and expiry extraction)
    const {
      token: refreshToken,
      sessionId,
      expiresAt,
    } = await this.jwtSignerService.signRefreshTokenWithSession({
      sub: user.id,
    });

    // 5. Save Session
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

    this.logger.log(`User ${user.email} logged in successfully`);
    this.domainEventPublisher.publish('auth.login.success', {
      userId: user.id,
    });

    return Result.success({ accessToken, refreshToken });
  }
}
