// src/modules/users/application/usecases/set-default-address/set-default-address.usecase.ts

import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/modules/identity/core/domain/repositories/user.repository';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';
import { ErrorCode } from 'src/shared-kernel/domain/exceptions/error-code';
import { userNotFoundError } from '../../../services/user-not-found';
import { ErrorKind } from 'src/shared-kernel/domain/exceptions/error-kind';
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
      return userNotFoundError(userId);
    }
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

    if (!user.addresses.some((address) => address.id === addressId)) {
      return ErrorFactory.UseCaseError(
        `Address with ID ${addressId} not found`,
        {
          kind: ErrorKind.NOT_FOUND,
          code: ErrorCode.ADDRESS_NOT_FOUND,
        },
      );
    }

    const setDefaultResult = user.setDefaultAddress(addressId);
    if (isFailure(setDefaultResult)) return setDefaultResult;

    const saveResult = await this.userRepository.save(user, expectedVersion);
    if (isFailure(saveResult)) return saveResult;

    return Result.success<void>(undefined);
  }
}
