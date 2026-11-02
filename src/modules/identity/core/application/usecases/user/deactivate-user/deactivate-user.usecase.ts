import { ErrorKind } from '../../../../../../../shared-kernel/domain/exceptions/error-kind';
import { userNotFoundError } from '../../../services/user-not-found';
import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { UserRepository } from '../../../../domain/repositories/user.repository';
import { DomainEventPublisher } from '../../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';

@Injectable()
export class DeactivateUserUseCase extends UseCase<number, void, UseCaseError> {
  private readonly logger = new Logger(DeactivateUserUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {
    super();
  }

  async execute(userId: number): Promise<Result<void, UseCaseError>> {
    const userResult = await this.userRepository.findByIdForUpdate(userId);
    if (userResult.isFailure) {
      if (userResult.error.kind === ErrorKind.NOT_FOUND) {
        return userNotFoundError(userId);
      }
      return userResult;
    }

    if (!userResult.value) {
      return userNotFoundError(userId);
    }

    const { entity: user, expectedVersion } = userResult.value;

    const deactivateResult = user.deactivate();
    if (deactivateResult.isFailure) {
      return deactivateResult;
    }

    const saveResult = await this.userRepository.save(user, expectedVersion);
    if (saveResult.isFailure) {
      return saveResult;
    }

    this.logger.log(`User ${userId} deactivated. Publishing event.`);
    this.domainEventPublisher.publish('user.deactivated', { userId });

    return Result.success(undefined);
  }
}
