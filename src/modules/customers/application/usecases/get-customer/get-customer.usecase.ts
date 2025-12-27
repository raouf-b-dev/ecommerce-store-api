// src/modules/customers/application/usecases/get-customer/get-customer.usecase.ts
import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../../domain/repositories/customer.repository';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { isFailure, Result } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ICustomer } from '../../../domain/interfaces/customer.interface';

@Injectable()
export class GetCustomerUseCase extends UseCase<
  number,
  ICustomer,
  UseCaseError
> {
  constructor(private readonly customerRepository: CustomerRepository) {
    super();
  }

  async execute(id: number): Promise<Result<ICustomer, UseCaseError>> {
    try {
      const customerResult = await this.customerRepository.findById(id);

      if (isFailure(customerResult)) return customerResult;

      return Result.success(customerResult.value.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
