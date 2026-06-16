// src/modules/customers/application/usecases/delete-address/delete-address.usecase.ts
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

export interface DeleteAddressInput {
  customerId: number;
  addressId: number;
  callerContext: CallerContext;
}

@Injectable()
export class DeleteAddressUseCase extends UseCase<
  DeleteAddressInput,
  void,
  UseCaseError
> {
  constructor(private readonly customerRepository: CustomerRepository) {
    super();
  }

  async execute(
    input: DeleteAddressInput,
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

    const removeResult = customer.removeAddress(addressId);
    if (isFailure(removeResult)) return removeResult;

    const saveResult = await this.customerRepository.update(customer);
    if (isFailure(saveResult)) return saveResult;

    return Result.success(undefined);
  }
}
