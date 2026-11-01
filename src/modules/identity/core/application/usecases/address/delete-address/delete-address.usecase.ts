import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ErrorCode } from '../../../../../../../shared-kernel/domain/exceptions/error-code';
import { userNotFoundError } from '../../../services/user-not-found';
import { ErrorKind } from '../../../../../../../shared-kernel/domain/exceptions/error-kind';
import { CallerContext } from '../../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  USER_MUTATION_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';
import { UserRepository } from 'src/modules/identity/core/domain/repositories/user.repository';

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
      return userNotFoundError(userId);
    }
    const userResult = await this.userRepository.findByIdForUpdate(userId);
    if (userResult.isFailure) {
      if (userResult.error.kind === ErrorKind.NOT_FOUND) {
        return userNotFoundError(userId);
      }
      return userResult;
    }

    const userPair = userResult.value;
    if (!userPair) {
      return userNotFoundError(userId);
    }
    const { entity: user, expectedVersion } = userPair;

    if (!user.addresses.some((address) => address.id === addressId)) {
      return ErrorFactory.UseCaseError(
        `Address with ID ${addressId} not found`,
        {
          kind: ErrorKind.NOT_FOUND,
          code: ErrorCode.ADDRESS_NOT_FOUND,
        },
      );
    }

    const deleteResult = user.deleteAddress(addressId);
    if (isFailure(deleteResult)) return deleteResult;

    const saveResult = await this.userRepository.save(user, expectedVersion);
    if (isFailure(saveResult)) return saveResult;

    return Result.success<void>(undefined);
  }
}
