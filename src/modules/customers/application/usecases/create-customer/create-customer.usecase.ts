// src/modules/customers/application/usecases/create-customer/create-customer.usecase.ts
import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../../domain/repositories/customer.repository';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { isFailure, Result } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { CreateCustomerDto } from '../../../presentation/dto/create-customer.dto';
import { ICustomer } from '../../../domain/interfaces/customer.interface';
import { Customer } from '../../../domain/entities/customer';
import { Address } from '../../../domain/entities/address';
import { DomainError } from '../../../../../core/errors/domain.error';

@Injectable()
export class CreateCustomerUseCase extends UseCase<
  CreateCustomerDto,
  ICustomer,
  UseCaseError
> {
  constructor(private readonly customerRepository: CustomerRepository) {
    super();
  }

  async execute(
    dto: CreateCustomerDto,
  ): Promise<Result<ICustomer, UseCaseError>> {
    try {
      const customer = Customer.create(
        null,
        dto.firstName,
        dto.lastName,
        dto.email,
        dto.phone ?? null,
      );

      if (dto.address) {
        const address = Address.create(
          dto.address.street,
          dto.address.city,
          dto.address.state,
          dto.address.postalCode,
          dto.address.country,
          dto.address.type,
          dto.address.street2,
          dto.address.deliveryInstructions,
          dto.address.isDefault ?? true,
        );

        const addResult = customer.addAddress(address);
        if (isFailure(addResult)) return addResult;
      }

      const saveResult = await this.customerRepository.save(customer);

      if (isFailure(saveResult)) return saveResult;

      return Result.success<ICustomer>(saveResult.value.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
