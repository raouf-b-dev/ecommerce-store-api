import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { JwtSignerService } from '../../../../../../infrastructure/jwt/jwt-signer.service';
import { JwtVerifierService } from '../../../../../../infrastructure/jwt/jwt-verifier.service';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { SessionTokenRepository } from '../../../domain/repositories/session-token.repository';
import { SessionToken } from '../../../domain/entities/session-token';

@Injectable()
export class RefreshTokenUseCase extends UseCase<
  { refreshToken: string },
  { accessToken: string; refreshToken: string },
  UseCaseError
> {
  private readonly logger = new Logger(RefreshTokenUseCase.name);

  constructor(
    private readonly jwtVerifierService: JwtVerifierService,
    private readonly jwtSignerService: JwtSignerService,
    private readonly sessionTokenRepository: SessionTokenRepository,
    private readonly userRepository: UserRepository,
  ) {
    super();
  }

  async execute(input: {
    refreshToken: string;
  }): Promise<
    Result<{ accessToken: string; refreshToken: string }, UseCaseError>
  > {
    try {
      // 1. Verify token signature and expiration
      const payload = await this.jwtVerifierService.verifyRefreshToken(
        input.refreshToken,
      );
      const sessionId = payload.sessionId;
      const userId = payload.sub;

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
      if (!session.isTokenMatch(input.refreshToken)) {
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
      const userResult = await this.userRepository.findById(userId);
      if (userResult.isFailure || !userResult.value) {
        return ErrorFactory.UseCaseError(
          'User not found',
          null,
          HttpStatus.UNAUTHORIZED,
        );
      }
      const user = userResult.value;

      // 6. Generate new tokens
      const newAccessToken = await this.jwtSignerService.signAccessToken({
        sub: user.id,
        email: user.email,
        role: user.roleCode,
        customerId: user.customerId,
      });

      const {
        token: newRefreshToken,
        sessionId: newSessionId,
        expiresAt,
      } = await this.jwtSignerService.signRefreshTokenWithSession({
        sub: user.id,
      });

      // 7. Save new session
      const newSession = SessionToken.create(
        user.id as number,
        newRefreshToken,
        expiresAt,
        newSessionId,
      );

      await this.sessionTokenRepository.save(newSession);

      return Result.success({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
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
