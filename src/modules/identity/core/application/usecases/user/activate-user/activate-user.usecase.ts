import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { UserRepository } from '../../../../domain/repositories/user.repository';

@Injectable()
export class ActivateUserUseCase extends UseCase<number, void, UseCaseError> {
  private readonly logger = new Logger(ActivateUserUseCase.name);

  constructor(private readonly userRepository: UserRepository) {
    super();
  }

  async execute(userId: number): Promise<Result<void, UseCaseError>> {
    const userResult = await this.userRepository.findByIdForUpdate(userId);
    if (userResult.isFailure) return userResult;

    if (!userResult.value)
      return ErrorFactory.UseCaseError(
        'User not found',
        null,
        HttpStatus.NOT_FOUND,
      );

    const { entity: user, expectedVersion } = userResult.value;

    const activateResult = user.activate();
    if (activateResult.isFailure) return activateResult;

    const saveResult = await this.userRepository.save(user, expectedVersion);
    if (saveResult.isFailure) {
      return ErrorFactory.UseCaseError('Failed to save user');
    }

    this.logger.log(`User ${userId} activated.`);

    return Result.success(undefined);
  }
}
