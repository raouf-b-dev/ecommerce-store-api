import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { SessionTokenRepository } from '../../../domain/repositories/session-token.repository';

@Injectable()
export class DeactivateUserUseCase extends UseCase<number, void, UseCaseError> {
  private readonly logger = new Logger(DeactivateUserUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionTokenRepository: SessionTokenRepository,
  ) {
    super();
  }

  async execute(userId: number): Promise<Result<void, UseCaseError>> {
    const userResult = await this.userRepository.findById(userId);
    if (userResult.isFailure || !userResult.value) {
      return ErrorFactory.UseCaseError(
        'User not found',
        null,
        HttpStatus.NOT_FOUND,
      );
    }

    const user = userResult.value;

    const deactivateResult = user.deactivate();
    if (deactivateResult.isFailure) {
      return deactivateResult;
    }

    const saveResult = await this.userRepository.save(user);
    if (saveResult.isFailure) {
      return saveResult;
    }

    this.logger.log(`User ${userId} deactivated. Revoking all sessions.`);
    await this.sessionTokenRepository.revokeAllForUser(userId);

    return Result.success(undefined);
  }
}
