// src/modules/users/application/usecases/set-default-address/set-default-address.usecase.ts

import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/modules/identity/core/domain/repositories/user.repository';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from 'src/shared-kernel/domain/exceptions/usecase.error';
import { UseCase } from 'src/shared-kernel/domain/interfaces/base.usecase';
import { CallerContext } from 'src/shared-kernel/domain/interfaces/caller-context.interface';
import {
  OwnedResourceAccessPolicy,
  USER_MUTATION_PERMISSIONS,
} from 'src/shared-kernel/domain/policies/owned-resource-access.policy';
import { isFailure, Result } from 'src/shared-kernel/domain/result';

export interface SetDefaultAddressInput {
  userId: number;
  addressId: number;
  callerContext: CallerContext;
}

@Injectable()
export class SetDefaultAddressUseCase extends UseCase<
  SetDefaultAddressInput,
  void,
  UseCaseError
> {
  constructor(private readonly userRepository: UserRepository) {
    super();
  }

  async execute(
    input: SetDefaultAddressInput,
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
    const userResult = await this.userRepository.findByIdForUpdate(userId);
    if (userResult.isFailure) return userResult;

    if (!userResult.value)
      return ErrorFactory.UseCaseError(`User with id ${userId} not found`);

    const { entity: user, expectedVersion } = userResult.value;

    const setDefaultResult = user.setDefaultAddress(addressId);
    if (isFailure(setDefaultResult)) return setDefaultResult;

    const saveResult = await this.userRepository.save(user, expectedVersion);
    if (isFailure(saveResult)) return saveResult;

    return Result.success<void>(undefined);
  }
}
