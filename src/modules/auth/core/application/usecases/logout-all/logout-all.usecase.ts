import { Injectable, Logger } from '@nestjs/common';
import { JwtVerifierService } from '../../../../../../infrastructure/jwt/jwt-verifier.service';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { SessionTokenRepository } from '../../../domain/repositories/session-token.repository';

@Injectable()
export class LogoutAllUseCase extends UseCase<
  { refreshToken: string },
  void,
  UseCaseError
> {
  private readonly logger = new Logger(LogoutAllUseCase.name);

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
      const userId = payload.sub;

      await this.sessionTokenRepository.revokeAllForUser(userId);

      this.logger.log(`All sessions revoked for user ${userId}`);

      return Result.success(undefined);
    } catch {
      return Result.success(undefined);
    }
  }
}
