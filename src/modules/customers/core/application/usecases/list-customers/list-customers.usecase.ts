// src/modules/customers/application/usecases/list-customers/list-customers.usecase.ts
import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/application/use-cases/base.usecase';
import { CustomerRepository } from '../../../domain/repositories/customer.repository';
import { UseCaseError } from '../../../../../../shared-kernel/errors/usecase.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/errors/error.factory';
import { ListCustomersQueryDto } from '../../../../primary-adapters/dto/list-customers-query.dto';
import { ICustomer } from '../../../domain/interfaces/customer.interface';

@Injectable()
export class ListCustomersUseCase
  implements UseCase<ListCustomersQueryDto, ICustomer[], UseCaseError>
{
  constructor(private customerRepository: CustomerRepository) {}

  async execute(
    dto: ListCustomersQueryDto,
  ): Promise<Result<ICustomer[], UseCaseError>> {
    try {
      const page = dto.page || 1;
      const limit = dto.limit || 20;

      const customersResult = await this.customerRepository.findAll(
        page,
        limit,
      );

      if (customersResult.isFailure) return customersResult;

      const result: ICustomer[] = customersResult.value.map((customer) =>
        customer.toPrimitives(),
      );

      return Result.success(result);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
