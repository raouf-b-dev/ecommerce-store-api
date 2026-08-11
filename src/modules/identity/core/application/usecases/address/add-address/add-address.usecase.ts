import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../../shared-kernel/domain/exceptions/error.factory';
import { AddressType } from '../../../../../../../shared-kernel/domain/value-objects/address-type';
import {
  USER_MUTATION_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';
import { UserRepository } from 'src/modules/identity/core/domain/repositories/user.repository';
import { AddAddressCommand } from '../../../commands/add-address.command';

@Injectable()
export class AddAddressUseCase extends UseCase<
  AddAddressCommand,
  void,
  UseCaseError
> {
  constructor(private readonly userRepository: UserRepository) {
    super();
  }

  async execute(
    command: AddAddressCommand,
  ): Promise<Result<void, UseCaseError>> {
    const {
      userId,
      callerContext,
      street,
      street2,
      city,
      state,
      postalCode,
      country,
      isDefault,
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

    if (!userResult.value) return ErrorFactory.UseCaseError('User not found');

    const { entity: user, expectedVersion } = userResult.value;

    const addResult = user.addAddress({
      street,
      city,
      state,
      postalCode,
      country,
      type: AddressType.SHIPPING,
      street2: street2 ?? null,
      deliveryInstructions: deliveryInstructions ?? null,
      isDefault: isDefault ?? false,
      userId,
      id: null,
      createdAt: null,
      updatedAt: null,
    });
    if (isFailure(addResult)) return addResult;

    const saveResult = await this.userRepository.save(user, expectedVersion);
    if (isFailure(saveResult)) return saveResult;

    return Result.success<void>(undefined);
  }
}
