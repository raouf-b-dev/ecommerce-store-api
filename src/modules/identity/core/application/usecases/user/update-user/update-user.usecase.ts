import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { UserRepository } from 'src/modules/identity/core/domain/repositories/user.repository';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';

export interface UpdateUserCommand {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface UpdateUserInput {
  id: number;
  command: UpdateUserCommand;
}

@Injectable()
export class UpdateUserUseCase extends UseCase<
  UpdateUserInput,
  void,
  UseCaseError
> {
  constructor(private readonly userRepository: UserRepository) {
    super();
  }

  async execute(input: UpdateUserInput): Promise<Result<void, UseCaseError>> {
    const { id, command: dto } = input;

    const userResult = await this.userRepository.findByIdForUpdate(id);
    if (isFailure(userResult)) return userResult;

    if (!userResult.value) return ErrorFactory.UseCaseError('User not found');

    const { entity: user, expectedVersion } = userResult.value;

    const updateResult = user.updatePersonalInfo(
      dto.firstName || user.firstName,
      dto.lastName || user.lastName,
      dto.email || user.email,
      dto.phone !== undefined ? dto.phone : user.phone,
    );

    if (isFailure(updateResult)) return updateResult;

    const saveResult = await this.userRepository.save(user, expectedVersion);
    if (isFailure(saveResult)) return saveResult;

    return Result.success<void>(undefined);
  }
}
