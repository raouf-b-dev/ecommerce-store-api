import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { StatusCode } from '../../../../../../shared-kernel/domain/exceptions/status-code';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { SessionTokenRepository } from '../../../domain/repositories/session-token.repository';
import { JwtSignerPort } from '../../ports/jwt-signer.port';
import { JwtVerifierPort } from '../../../../../../shared-kernel/domain/interfaces/jwt-verifier.port';
import { IdentityGateway } from '../../ports/identity.gateway';
import { AuthorizationGateway } from '../../ports/authorization.gateway';
import { AuthTokensResult } from '../../commands/results/auth-tokens.result';
import { CredentialRepository } from '../../../domain/repositories/credential.repository';

const REUSE_MESSAGE = 'Refresh token reuse detected. All sessions revoked.';

@Injectable()
export class RefreshTokenUseCase extends UseCase<
  string,
  AuthTokensResult,
  UseCaseError
> {
  private readonly logger = new Logger(RefreshTokenUseCase.name);

  constructor(
    private readonly jwtVerifierService: JwtVerifierPort,
    private readonly jwtSignerService: JwtSignerPort,
    private readonly sessionTokenRepository: SessionTokenRepository,
    private readonly identityGateway: IdentityGateway,
    private readonly authorizationGateway: AuthorizationGateway,
    private readonly credentialRepository: CredentialRepository,
  ) {
    super();
  }

  async execute(
    refreshToken: string,
  ): Promise<Result<AuthTokensResult, UseCaseError>> {
    try {
      const payload =
        await this.jwtVerifierService.verifyRefreshToken(refreshToken);
      const sessionId = payload.sid;

      const sessionResult =
        await this.sessionTokenRepository.findById(sessionId);
      if (sessionResult.isFailure) {
        return ErrorFactory.UseCaseError(
          'Failed to load session',
          sessionResult.error,
          sessionResult.error.statusCode,
          sessionResult.error.retryable,
        );
      }
      if (!sessionResult.value) {
        return ErrorFactory.UseCaseError(
          'Session not found',
          null,
          HttpStatus.UNAUTHORIZED,
        );
      }
      const session = sessionResult.value;

      if (!session.isValid) {
        return ErrorFactory.UseCaseError(
          'Invalid or expired session',
          null,
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (!session.isTokenMatch(refreshToken)) {
        return this.revokeForReuse(session.userId);
      }

      const userResult = await this.identityGateway.findUserById(
        session.userId,
      );
      if (userResult.isFailure) {
        return ErrorFactory.UseCaseError(
          'User not found',
          userResult.error,
          userResult.error.statusCode,
          userResult.error.retryable,
        );
      }
      if (!userResult.value) {
        return ErrorFactory.UseCaseError(
          'User not found',
          null,
          HttpStatus.UNAUTHORIZED,
        );
      }
      const user = userResult.value;

      const roleResult = await this.authorizationGateway.findRoleByUserId(
        user.id,
      );
      if (roleResult.isFailure) {
        return ErrorFactory.UseCaseError(
          'Failed to resolve user role',
          roleResult.error,
          roleResult.error.statusCode,
          roleResult.error.retryable,
        );
      }
      if (!roleResult.value) {
        return ErrorFactory.UseCaseError(
          'Failed to resolve user role',
          null,
          HttpStatus.UNAUTHORIZED,
        );
      }

      const credentialResult = await this.credentialRepository.findByUserId(
        user.id,
      );
      if (credentialResult.isFailure) {
        return ErrorFactory.UseCaseError(
          'Failed to retrieve credential information',
          credentialResult.error,
          HttpStatus.INTERNAL_SERVER_ERROR,
          credentialResult.error.retryable,
        );
      }

      const mustChangePassword =
        credentialResult.value?.mustChangePassword ?? false;

      const newAccessToken = await this.jwtSignerService.signAccessToken({
        sub: user.id.toString(),
        email: user.email,
        role: roleResult.value.code,
        mustChangePassword,
      });

      const { token: newRefreshToken, expiresAt } =
        await this.jwtSignerService.signRefreshTokenWithSession({
          sub: user.id,
          sid: session.id,
        });

      const expectedTokenHash = session.tokenHash;
      session.rotate(newRefreshToken, expiresAt);
      const replaced = await this.sessionTokenRepository.replaceTokenIfCurrent(
        session,
        expectedTokenHash,
      );
      if (replaced.isFailure) {
        if (replaced.error.statusCode === StatusCode.CONFLICT) {
          return this.rejectStaleRotation(
            sessionId,
            refreshToken,
            session.userId,
          );
        }

        return ErrorFactory.UseCaseError(
          'Failed to rotate refresh token',
          replaced.error,
          replaced.error.statusCode,
          replaced.error.retryable,
        );
      }

      return Result.success<AuthTokensResult>({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        mustChangePassword,
        permissions: roleResult.value.permissions,
      });
    } catch {
      return ErrorFactory.UseCaseError(
        'Invalid refresh token',
        null,
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  private async revokeForReuse(
    userId: number,
  ): Promise<Result<AuthTokensResult, UseCaseError>> {
    this.logger.warn(
      `Refresh token reuse detected for user ${userId}. Revoking all sessions.`,
    );
    const revokeResult =
      await this.sessionTokenRepository.revokeAllForUser(userId);
    if (revokeResult.isFailure) {
      return ErrorFactory.UseCaseError(
        'Failed to revoke sessions after refresh token reuse',
        revokeResult.error,
        revokeResult.error.statusCode,
        revokeResult.error.retryable,
      );
    }

    return ErrorFactory.UseCaseError(
      REUSE_MESSAGE,
      null,
      HttpStatus.UNAUTHORIZED,
    );
  }

  private async rejectStaleRotation(
    sessionId: string,
    refreshToken: string,
    userId: number,
  ): Promise<Result<AuthTokensResult, UseCaseError>> {
    const current = await this.sessionTokenRepository.findById(sessionId);
    if (current.isFailure) {
      return ErrorFactory.UseCaseError(
        'Failed to load session',
        current.error,
        current.error.statusCode,
        current.error.retryable,
      );
    }

    if (
      current.value &&
      current.value.isValid &&
      !current.value.isTokenMatch(refreshToken)
    ) {
      return this.revokeForReuse(userId);
    }

    return ErrorFactory.UseCaseError(
      'Invalid or expired session',
      null,
      HttpStatus.UNAUTHORIZED,
    );
  }
}
