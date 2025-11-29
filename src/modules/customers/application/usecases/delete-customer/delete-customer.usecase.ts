// src/modules/customers/application/usecases/delete-customer/delete-customer.usecase.ts
import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../../domain/repositories/customer.repository';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { isFailure, Result } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class DeleteCustomerUseCase extends UseCase<string, void, UseCaseError> {
  constructor(private readonly customerRepository: CustomerRepository) {
    super();
  }

  async execute(id: string): Promise<Result<void, UseCaseError>> {
    try {
      const deleteResult = await this.customerRepository.delete(id);

      if (isFailure(deleteResult)) return deleteResult;

      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
