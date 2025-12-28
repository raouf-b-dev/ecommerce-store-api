// src/modules/customers/application/usecases/update-address/update-address.usecase.ts
import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../../domain/repositories/customer.repository';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { isFailure, Result } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { UpdateAddressDto } from '../../../presentation/dto/update-address.dto';
import { IAddress } from '../../../domain/interfaces/address.interface';

export interface UpdateAddressInput {
  customerId: number;
  addressId: number;
  dto: UpdateAddressDto;
}

@Injectable()
export class UpdateAddressUseCase extends UseCase<
  UpdateAddressInput,
  IAddress,
  UseCaseError
> {
  constructor(private readonly customerRepository: CustomerRepository) {
    super();
  }

  async execute(
    input: UpdateAddressInput,
  ): Promise<Result<IAddress, UseCaseError>> {
    try {
      const { customerId, addressId, dto } = input;

      const customerResult = await this.customerRepository.findById(customerId);
      if (isFailure(customerResult)) return customerResult;

      const customer = customerResult.value;

      const existingAddress = customer.findAddress(addressId);
      if (!existingAddress)
        return ErrorFactory.UseCaseError(
          `Address with id ${addressId} not found`,
        );

      const updateResult = customer.updateAddress(
        addressId,
        dto.street ?? existingAddress.street,
        dto.city ?? existingAddress.city,
        dto.state ?? existingAddress.state,
        dto.postalCode ?? existingAddress.postalCode,
        dto.country ?? existingAddress.country,
        dto.street2 !== undefined ? dto.street2 : existingAddress.street2,
        dto.type ?? existingAddress.type,
        dto.deliveryInstructions !== undefined
          ? dto.deliveryInstructions
          : existingAddress.deliveryInstructions,
      );

      if (isFailure(updateResult)) return updateResult;

      const saveResult = await this.customerRepository.update(customer);
      if (isFailure(saveResult)) return saveResult;

      const updatedAddress = saveResult.value.findAddress(addressId);
      if (!updatedAddress)
        return ErrorFactory.UseCaseError('Failed to retrieve updated address');

      return Result.success<IAddress>(updatedAddress.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
