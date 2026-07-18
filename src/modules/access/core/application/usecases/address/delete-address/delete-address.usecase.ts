import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../../shared-kernel/domain/exceptions/error.factory';
import { CallerContext } from '../../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  USER_MUTATION_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';
import { UserRepository } from 'src/modules/access/core/domain/repositories/user.repository';

export interface DeleteAddressInput {
  userId: number;
  addressId: number;
  callerContext: CallerContext;
}

@Injectable()
export class DeleteAddressUseCase extends UseCase<
  DeleteAddressInput,
  void,
  UseCaseError
> {
  constructor(private readonly userRepository: UserRepository) {
    super();
  }

  async execute(
    input: DeleteAddressInput,
  ): Promise<Result<void, UseCaseError>> {
    const { userId, addressId, callerContext } = input;

    if (
      !OwnedResourceAccessPolicy.canMutateResource(
        callerContext,
        userId,
        USER_MUTATION_PERMISSIONS,
      )
    ) {
      return ErrorFactory.UseCaseError(`User with id ${userId} not found`);
    }
    const userResult = await this.userRepository.findById(userId);
    if (userResult.isFailure) return userResult;

    const user = userResult.value;
    if (!user) return ErrorFactory.UseCaseError('User not found');

    const deleteResult = user.deleteAddress(addressId);
    if (isFailure(deleteResult)) return deleteResult;

    const saveResult = await this.userRepository.update(user);
    if (isFailure(saveResult)) return saveResult;

    return Result.success<void>(undefined);
  }
}
