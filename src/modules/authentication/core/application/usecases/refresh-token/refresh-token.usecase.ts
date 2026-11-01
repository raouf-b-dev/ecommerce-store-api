import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ErrorKind } from '../../../../../../shared-kernel/domain/exceptions/error-kind';
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
        return ErrorFactory.UseCaseError('Failed to load session', {
          cause: sessionResult.error,
          kind: sessionResult.error.kind,
          retryable: sessionResult.error.retryable,
        });
      }
      if (!sessionResult.value) {
        return ErrorFactory.UseCaseError('Session not found', {
          kind: ErrorKind.UNAUTHENTICATED,
        });
      }
      const session = sessionResult.value;

      if (!session.isValid) {
        return ErrorFactory.UseCaseError('Invalid or expired session', {
          kind: ErrorKind.UNAUTHENTICATED,
        });
      }

      if (!session.isTokenMatch(refreshToken)) {
        return this.revokeForReuse(session.userId);
      }

      const userResult = await this.identityGateway.findUserById(
        session.userId,
      );
      if (userResult.isFailure) {
        return ErrorFactory.UseCaseError('User not found', {
          cause: userResult.error,
          kind: userResult.error.kind,
          retryable: userResult.error.retryable,
        });
      }
      if (!userResult.value) {
        return ErrorFactory.UseCaseError('User not found', {
          kind: ErrorKind.UNAUTHENTICATED,
        });
      }
      const user = userResult.value;

      const roleResult = await this.authorizationGateway.findRoleByUserId(
        user.id,
      );
      if (roleResult.isFailure) {
        return ErrorFactory.UseCaseError('Failed to resolve user role', {
          cause: roleResult.error,
          kind: roleResult.error.kind,
          retryable: roleResult.error.retryable,
        });
      }
      if (!roleResult.value) {
        return ErrorFactory.UseCaseError('Failed to resolve user role', {
          kind: ErrorKind.UNAUTHENTICATED,
        });
      }

      const credentialResult = await this.credentialRepository.findByUserId(
        user.id,
      );
      if (credentialResult.isFailure) {
        return ErrorFactory.UseCaseError(
          'Failed to retrieve credential information',
          {
            cause: credentialResult.error,
            kind: ErrorKind.INTERNAL,
            retryable: credentialResult.error.retryable,
          },
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
        if (replaced.error.kind === ErrorKind.CONFLICT) {
          return this.rejectStaleRotation(
            sessionId,
            refreshToken,
            session.userId,
          );
        }

        return ErrorFactory.UseCaseError('Failed to rotate refresh token', {
          cause: replaced.error,
          kind: replaced.error.kind,
          retryable: replaced.error.retryable,
        });
      }

      return Result.success<AuthTokensResult>({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        mustChangePassword,
        permissions: roleResult.value.permissions,
      });
    } catch {
      return ErrorFactory.UseCaseError('Invalid refresh token', {
        kind: ErrorKind.UNAUTHENTICATED,
      });
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
        {
          cause: revokeResult.error,
          kind: revokeResult.error.kind,
          retryable: revokeResult.error.retryable,
        },
      );
    }

    return ErrorFactory.UseCaseError(REUSE_MESSAGE, {
      kind: ErrorKind.UNAUTHENTICATED,
    });
  }

  private async rejectStaleRotation(
    sessionId: string,
    refreshToken: string,
    userId: number,
  ): Promise<Result<AuthTokensResult, UseCaseError>> {
    const current = await this.sessionTokenRepository.findById(sessionId);
    if (current.isFailure) {
      return ErrorFactory.UseCaseError('Failed to load session', {
        cause: current.error,
        kind: current.error.kind,
        retryable: current.error.retryable,
      });
    }

    if (
      current.value &&
      current.value.isValid &&
      !current.value.isTokenMatch(refreshToken)
    ) {
      return this.revokeForReuse(userId);
    }

    return ErrorFactory.UseCaseError('Invalid or expired session', {
      kind: ErrorKind.UNAUTHENTICATED,
    });
  }
}
