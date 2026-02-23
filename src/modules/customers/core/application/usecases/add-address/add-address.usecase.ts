// src/modules/customers/application/usecases/add-address/add-address.usecase.ts
import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../../domain/repositories/customer.repository';
import { UseCase } from '../../../../../../shared-kernel/application/use-cases/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/errors/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/errors/error.factory';
import { AddAddressDto } from '../../../../primary-adapters/dto/add-address.dto';
import { IAddress } from '../../../domain/interfaces/address.interface';
import { Address } from '../../../domain/entities/address';

export interface AddAddressInput {
  customerId: number;
  dto: AddAddressDto;
}

@Injectable()
export class AddAddressUseCase extends UseCase<
  AddAddressInput,
  IAddress,
  UseCaseError
> {
  constructor(private readonly customerRepository: CustomerRepository) {
    super();
  }

  async execute(
    input: AddAddressInput,
  ): Promise<Result<IAddress, UseCaseError>> {
    try {
      const { customerId, dto } = input;

      // Retrieve the customer
      const customerResult = await this.customerRepository.findById(customerId);
      if (isFailure(customerResult)) return customerResult;

      const customer = customerResult.value;

      // Create new address - repository will generate ID during save
      const address = Address.create(
        customerId,
        dto.street,
        dto.city,
        dto.state,
        dto.postalCode,
        dto.country,
        dto.type,
        dto.street2,
        dto.deliveryInstructions,
        dto.isDefault,
      );

      // Add address to customer
      const addResult = customer.addAddress(address);
      if (isFailure(addResult)) return addResult;

      // Save the updated customer - repository will generate address ID
      const saveResult = await this.customerRepository.update(customer);
      if (isFailure(saveResult)) return saveResult;

      // Find and return the newly added address (it will have ID now)
      const addresses = saveResult.value.addresses;
      const newAddress = addresses[addresses.length - 1]; // Last added address

      return Result.success<IAddress>(newAddress);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
