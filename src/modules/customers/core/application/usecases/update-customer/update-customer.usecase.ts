// src/modules/customers/application/usecases/update-customer/update-customer.usecase.ts
import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../../domain/repositories/customer.repository';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UpdateCustomerDto } from '../../../../primary-adapters/dto/update-customer.dto';
import { ICustomer } from '../../../domain/interfaces/customer.interface';

export interface UpdateCustomerInput {
  id: number;
  dto: UpdateCustomerDto;
}

@Injectable()
export class UpdateCustomerUseCase extends UseCase<
  UpdateCustomerInput,
  ICustomer,
  UseCaseError
> {
  constructor(private readonly customerRepository: CustomerRepository) {
    super();
  }

  async execute(
    input: UpdateCustomerInput,
  ): Promise<Result<ICustomer, UseCaseError>> {
    try {
      const { id, dto } = input;

      const customerResult = await this.customerRepository.findById(id);
      if (isFailure(customerResult)) return customerResult;

      const customer = customerResult.value;

      if (dto.firstName || dto.lastName || dto.phone !== undefined) {
        const updateResult = customer.updatePersonalInfo(
          dto.firstName || customer.firstName,
          dto.lastName || customer.lastName,
          dto.phone !== undefined ? dto.phone : customer.phone,
        );

        if (isFailure(updateResult)) return updateResult;
      }

      const saveResult = await this.customerRepository.update(customer);
      if (isFailure(saveResult)) return saveResult;

      return Result.success<ICustomer>(saveResult.value.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
