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
import { UserRepository } from 'src/modules/access/core/domain/repositories/user.repository';

export interface AddAddressCommand {
  street: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type?: AddressType;
  isDefault?: boolean;
  deliveryInstructions?: string;
}

export interface AddAddressInput {
  userId: number;
  command: AddAddressCommand;
  callerContext: CallerContext;
}

@Injectable()
export class AddAddressUseCase extends UseCase<
  AddAddressInput,
  void,
  UseCaseError
> {
  constructor(private readonly userRepository: UserRepository) {
    super();
  }

  async execute(input: AddAddressInput): Promise<Result<void, UseCaseError>> {
    const { userId, command: dto, callerContext } = input;

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
    if (isFailure(userResult)) return userResult;

    const user = userResult.value;

    if (!user) return ErrorFactory.UseCaseError('User not found');

    //check if address already exist
    const addResult = user.addAddress({
      street: dto.street,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country,
      type: dto.type ?? AddressType.SHIPPING,
      street2: dto.street2 ?? null,
      deliveryInstructions: dto.deliveryInstructions ?? null,
      isDefault: dto.isDefault ?? false,
      userId: userId,
      id: null,
      createdAt: null,
      updatedAt: null,
    });
    if (isFailure(addResult)) return addResult;

    const saveResult = await this.userRepository.update(user);
    if (isFailure(saveResult)) return saveResult;

    return Result.success<void>(undefined);
  }
}
