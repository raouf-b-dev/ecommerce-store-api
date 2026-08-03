// src/modules/users/application/usecases/update-address/update-address.usecase.ts
import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../../shared-kernel/domain/exceptions/error.factory';
import { AddressType } from '../../../../../../../shared-kernel/domain/value-objects/address-type';
import { CallerContext } from '../../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  USER_MUTATION_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';
import { UserRepository } from 'src/modules/identity/core/domain/repositories/user.repository';

export interface UpdateAddressCommand {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  type?: AddressType;
  deliveryInstructions?: string;
}

export interface UpdateAddressInput {
  userId: number;
  addressId: number;
  command: UpdateAddressCommand;
  callerContext: CallerContext;
}

@Injectable()
export class UpdateAddressUseCase extends UseCase<
  UpdateAddressInput,
  void,
  UseCaseError
> {
  constructor(private readonly userRepository: UserRepository) {
    super();
  }

  async execute(
    input: UpdateAddressInput,
  ): Promise<Result<void, UseCaseError>> {
    const { userId, addressId, command: dto, callerContext } = input;

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
      street: dto.street ?? null,
      city: dto.city ?? null,
      state: dto.state ?? null,
      postalCode: dto.postalCode ?? null,
      country: dto.country ?? null,
      street2: dto.street2 ?? null,
      type: dto.type ?? null,
      deliveryInstructions: dto.deliveryInstructions ?? null,
    });

    if (isFailure(updateResult)) return updateResult;

    const saveResult = await this.userRepository.save(user, expectedVersion);
    if (isFailure(saveResult)) return saveResult;

    return Result.success<void>(undefined);
  }
}
