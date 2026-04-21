import { Injectable } from '@nestjs/common';
import { JwtVerifierService } from '../../../../../../infrastructure/jwt/jwt-verifier.service';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { SessionTokenRepository } from '../../../domain/repositories/session-token.repository';

@Injectable()
export class LogoutUseCase extends UseCase<
  { refreshToken: string },
  void,
  UseCaseError
> {
  constructor(
    private readonly jwtVerifierService: JwtVerifierService,
    private readonly sessionTokenRepository: SessionTokenRepository,
  ) {
    super();
  }

  async execute(input: {
    refreshToken: string;
  }): Promise<Result<void, UseCaseError>> {
    try {
      const payload = await this.jwtVerifierService.verifyRefreshToken(
        input.refreshToken,
      );
      const sessionId = payload.sessionId as string;

      const sessionResult =
        await this.sessionTokenRepository.findById(sessionId);
      if (sessionResult.isFailure || !sessionResult.value) {
        return Result.success(undefined); // Idempotent
      }

      const session = sessionResult.value;
      if (session.isValid && session.isTokenMatch(input.refreshToken)) {
        session.revoke();
        await this.sessionTokenRepository.save(session);
      }

      return Result.success(undefined);
    } catch {
      return Result.success(undefined); // Invalid token? Still consider logged out. Ignore.
    }
  }
}
