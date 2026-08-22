import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { UserRepository } from 'src/modules/identity/core/domain/repositories/user.repository';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';
import { UpdateUserCommand } from '../../../commands/update-user.command';

@Injectable()
export class UpdateUserUseCase extends UseCase<
  UpdateUserCommand,
  void,
  UseCaseError
> {
  constructor(private readonly userRepository: UserRepository) {
    super();
  }

  async execute(
    command: UpdateUserCommand,
  ): Promise<Result<void, UseCaseError>> {
    const { id, firstName, lastName, email, phone } = command;

    const userResult = await this.userRepository.findByIdForUpdate(id);
    if (isFailure(userResult)) return userResult;

    if (!userResult.value) return ErrorFactory.UseCaseError('User not found');

    const { entity: user, expectedVersion } = userResult.value;

    const updateResult = user.updatePersonalInfo(
      firstName || user.firstName,
      lastName || user.lastName,
      email || user.email,
      phone !== undefined ? phone : user.phone,
    );

    if (isFailure(updateResult)) return updateResult;

    const saveResult = await this.userRepository.save(user, expectedVersion);
    if (isFailure(saveResult)) return saveResult;

    return Result.success<void>(undefined);
  }
}
