// src/modules/customers/application/usecases/delete-customer/delete-customer.usecase.ts
import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../../domain/repositories/customer.repository';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class DeleteCustomerUseCase extends UseCase<number, void, UseCaseError> {
  constructor(private readonly customerRepository: CustomerRepository) {
    super();
  }

  async execute(id: number): Promise<Result<void, UseCaseError>> {
    try {
      const deleteResult = await this.customerRepository.delete(id);

      if (isFailure(deleteResult)) return deleteResult;

      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
