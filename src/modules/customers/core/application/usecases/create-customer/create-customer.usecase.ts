// src/modules/customers/application/usecases/create-customer/create-customer.usecase.ts
import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../../domain/repositories/customer.repository';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ICustomer } from '../../../domain/interfaces/customer.interface';
import { Customer, CustomerProps } from '../../../domain/entities/customer';
import { Address, AddressProps } from '../../../domain/entities/address';
import { AddressType } from '../../../domain/value-objects/address-type';

export interface CreateCustomerAddressInput {
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

export interface CreateCustomerCommand {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: CreateCustomerAddressInput;
}

@Injectable()
export class CreateCustomerUseCase extends UseCase<
  CreateCustomerCommand,
  ICustomer,
  UseCaseError
> {
  constructor(private readonly customerRepository: CustomerRepository) {
    super();
  }

  async execute(
    dto: CreateCustomerCommand,
  ): Promise<Result<ICustomer, UseCaseError>> {
    const props: CustomerProps = {
      id: null,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone ?? null,
      addresses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const customer = new Customer(props);

    if (dto.address) {
      const addressProps: AddressProps = {
        id: null,
        customerId: customer.id || 0,
        street: dto.address.street,
        street2: dto.address.street2 ?? null,
        city: dto.address.city,
        state: dto.address.state,
        postalCode: dto.address.postalCode,
        country: dto.address.country,
        type: dto.address.type || AddressType.HOME,
        isDefault: dto.address.isDefault ?? true,
        deliveryInstructions: dto.address.deliveryInstructions ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const address = new Address(addressProps);

      const addResult = customer.addAddress(address);
      if (isFailure(addResult)) return addResult;
    }

    const saveResult = await this.customerRepository.save(customer);

    if (isFailure(saveResult)) return saveResult;

    return Result.success<ICustomer>(saveResult.value.toPrimitives());
  }
}
