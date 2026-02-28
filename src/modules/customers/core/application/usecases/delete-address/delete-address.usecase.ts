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

export interface DeleteAddressInput {
  customerId: number;
  addressId: number;
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
    try {
      const { customerId, addressId } = input;

      // Retrieve the customer
      const customerResult = await this.customerRepository.findById(customerId);
      if (isFailure(customerResult)) return customerResult;

      const customer = customerResult.value;

      // Remove the address
      const removeResult = customer.removeAddress(addressId);
      if (isFailure(removeResult)) return removeResult;

      // Save the updated customer
      const saveResult = await this.customerRepository.update(customer);
      if (isFailure(saveResult)) return saveResult;

      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
