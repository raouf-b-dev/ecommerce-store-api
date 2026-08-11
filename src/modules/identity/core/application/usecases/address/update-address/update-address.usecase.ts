import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../../shared-kernel/domain/exceptions/error.factory';
import {
  USER_MUTATION_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';
import { UserRepository } from 'src/modules/identity/core/domain/repositories/user.repository';
import { UpdateAddressCommand } from '../../../commands/update-address.command';

@Injectable()
export class UpdateAddressUseCase extends UseCase<
  UpdateAddressCommand,
  void,
  UseCaseError
> {
  constructor(private readonly userRepository: UserRepository) {
    super();
  }

  async execute(
    command: UpdateAddressCommand,
  ): Promise<Result<void, UseCaseError>> {
    const {
      userId,
      addressId,
      callerContext,
      street,
      street2,
      city,
      state,
      postalCode,
      country,
      deliveryInstructions,
    } = command;

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
    if (isFailure(userResult)) return userResult;

    if (!userResult.value)
      return ErrorFactory.UseCaseError(`User with id ${userId} not found`);

    const { entity: user, expectedVersion } = userResult.value;

    const updateResult = user.updateAddress(addressId, {
      street: street ?? null,
      city: city ?? null,
      state: state ?? null,
      postalCode: postalCode ?? null,
      country: country ?? null,
      street2: street2 ?? null,
      type: null,
      deliveryInstructions: deliveryInstructions ?? null,
    });

    if (isFailure(updateResult)) return updateResult;

    const saveResult = await this.userRepository.save(user, expectedVersion);
    if (isFailure(saveResult)) return saveResult;

    return Result.success<void>(undefined);
  }
}
