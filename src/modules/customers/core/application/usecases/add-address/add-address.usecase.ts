// src/modules/customers/application/usecases/add-address/add-address.usecase.ts
import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../../domain/repositories/customer.repository';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { AddressType } from '../../../domain/value-objects/address-type';
import { IAddress } from '../../../domain/interfaces/address.interface';
import { Address } from '../../../domain/entities/address';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  CUSTOMER_MUTATION_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';

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
  customerId: number;
  command: AddAddressCommand;
  callerContext: CallerContext;
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
    const { customerId, command: dto, callerContext } = input;

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

    const addResult = customer.addAddress(address);
    if (isFailure(addResult)) return addResult;

    const existingAddressIds = new Set(
      customer.addresses
        .map((addr) => addr.id)
        .filter((id): id is number => id !== null),
    );

    const saveResult = await this.customerRepository.update(customer);
    if (isFailure(saveResult)) return saveResult;

    const savedAddresses = saveResult.value.addresses;
    const newAddress =
      savedAddresses.find(
        (addr) => addr.id !== null && !existingAddressIds.has(addr.id),
      ) ?? savedAddresses[savedAddresses.length - 1];

    return Result.success<IAddress>(newAddress);
  }
}
