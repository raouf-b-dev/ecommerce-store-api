// src/modules/customers/application/usecases/set-default-address/set-default-address.usecase.ts
import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../../domain/repositories/customer.repository';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { isFailure, Result } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

export interface SetDefaultAddressInput {
  customerId: string;
  addressId: string;
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
    try {
      const { customerId, addressId } = input;

      // Retrieve the customer
      const customerResult = await this.customerRepository.findById(customerId);
      if (isFailure(customerResult)) return customerResult;

      const customer = customerResult.value;

      // Set the default address
      const setDefaultResult = customer.setDefaultAddress(addressId);
      if (isFailure(setDefaultResult)) return setDefaultResult;

      // Save the updated customer
      const saveResult = await this.customerRepository.update(customer);
      if (isFailure(saveResult)) return saveResult;

      return Result.success<void>(undefined);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
