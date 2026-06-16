// src/modules/customers/application/usecases/set-default-address/set-default-address.usecase.ts
import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../../domain/repositories/customer.repository';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  CUSTOMER_MUTATION_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';

export interface SetDefaultAddressInput {
  customerId: number;
  addressId: number;
  callerContext: CallerContext;
}

@Injectable()
export class SetDefaultAddressUseCase extends UseCase<
  SetDefaultAddressInput,
  void,
  UseCaseError
> {
  constructor(private readonly customerRepository: CustomerRepository) {
    super();
  }

  async execute(
    input: SetDefaultAddressInput,
  ): Promise<Result<void, UseCaseError>> {
    const { customerId, addressId, callerContext } = input;

    if (
      !OwnedResourceAccessPolicy.canMutateResource(
        callerContext,
        customerId,
        CUSTOMER_MUTATION_PERMISSIONS,
      )
    ) {
      return ErrorFactory.UseCaseError(
        `Customer with id ${customerId} not found`,
      );
    }

    const customerResult = await this.customerRepository.findById(customerId);
    if (isFailure(customerResult)) return customerResult;

    const customer = customerResult.value;

    const setDefaultResult = customer.setDefaultAddress(addressId);
    if (isFailure(setDefaultResult)) return setDefaultResult;

    const saveResult = await this.customerRepository.update(customer);
    if (isFailure(saveResult)) return saveResult;

    return Result.success<void>(undefined);
  }
}
