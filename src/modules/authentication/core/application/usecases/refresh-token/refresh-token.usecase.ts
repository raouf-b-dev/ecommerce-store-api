import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { SessionTokenRepository } from '../../../domain/repositories/session-token.repository';
import { SessionToken } from '../../../domain/entities/session-token';
import { JwtSignerPort } from '../../ports/jwt-signer.port';
import { JwtVerifierPort } from '../../../../../../shared-kernel/domain/interfaces/jwt-verifier.port';
import { IdentityGateway } from '../../ports/identity.gateway';
import { AuthorizationGateway } from '../../ports/authorization.gateway';
import { AuthTokensResult } from '../../commands/results/auth-tokens.result';
import { CredentialRepository } from '../../../domain/repositories/credential.repository';

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
      // 1. Verify token signature and expiration
      const payload =
        await this.jwtVerifierService.verifyRefreshToken(refreshToken);
      const sessionId = payload.sid;
      const userId = Number(payload.sub);

      // 2. Find session in DB
      const sessionResult =
        await this.sessionTokenRepository.findById(sessionId);
      if (sessionResult.isFailure || !sessionResult.value) {
        return ErrorFactory.UseCaseError(
          'Session not found',
          null,
          HttpStatus.UNAUTHORIZED,
        );
      }
      const session = sessionResult.value;

      // 3. Check if session is valid (not revoked / not expired)
      if (!session.isValid) {
        return ErrorFactory.UseCaseError(
          'Invalid or expired session',
          null,
          HttpStatus.UNAUTHORIZED,
        );
      }

      // 3b. Reuse detection — token hash mismatch on a valid session means
      //     a previously rotated token is being replayed (stolen token attack)
      if (!session.isTokenMatch(refreshToken)) {
        this.logger.warn(
          `Refresh token reuse detected for user ${userId}. Revoking all sessions.`,
        );
        await this.sessionTokenRepository.revokeAllForUser(userId);

        return ErrorFactory.UseCaseError(
          'Refresh token reuse detected. All sessions revoked.',
          null,
          HttpStatus.UNAUTHORIZED,
        );
      }

      // 4. Revoke old session
      session.revoke();
      await this.sessionTokenRepository.save(session);

      // 5. Load user to get updated access token payload
      const userResult = await this.identityGateway.findUserById(userId);
      if (userResult.isFailure || !userResult.value) {
        return ErrorFactory.UseCaseError(
          'User not found',
          null,
          HttpStatus.UNAUTHORIZED,
        );
      }
      const user = userResult.value;

      // 6. Resolve role code for JWT payload (PermissionsGuard requires the string code)
      const roleResult = await this.authorizationGateway.findRoleByUserId(
        user.id,
      );
      if (roleResult.isFailure || !roleResult.value) {
        return ErrorFactory.UseCaseError(
          'Failed to resolve user role',
          null,
          HttpStatus.UNAUTHORIZED,
        );
      }

      // 7. Load the credential flag so it can ride along in the access token
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

      const mustChangePassword =
        credentialResult.value?.mustChangePassword ?? false;

      // 8. Generate new tokens
      const newAccessToken = await this.jwtSignerService.signAccessToken({
        sub: user.id.toString(),
        email: user.email,
        role: roleResult.value.code,
        mustChangePassword,
      });

      const {
        token: newRefreshToken,
        sessionId: newSessionId,
        expiresAt,
      } = await this.jwtSignerService.signRefreshTokenWithSession({
        sub: user.id,
      });

      // 9. Save new session
      const newSession = SessionToken.create(
        user.id,
        newRefreshToken,
        expiresAt,
        newSessionId,
      );

      await this.sessionTokenRepository.save(newSession);

      return Result.success<AuthTokensResult>({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        mustChangePassword,
      });
    } catch {
      return ErrorFactory.UseCaseError(
        'Invalid refresh token',
        null,
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
