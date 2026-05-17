// src/modules/customers/application/usecases/list-customers/list-customers.usecase.ts
import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { CustomerRepository } from '../../../domain/repositories/customer.repository';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
export interface ListCustomersQuery {
  search?: string;
  email?: string;
  phone?: string;
  page?: number;
  limit?: number;
}
import { ICustomer } from '../../../domain/interfaces/customer.interface';

@Injectable()
export class ListCustomersUseCase
  implements UseCase<ListCustomersQuery, ICustomer[], UseCaseError>
{
  constructor(private customerRepository: CustomerRepository) {}

  async execute(
    query: ListCustomersQuery,
  ): Promise<Result<ICustomer[], UseCaseError>> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const customersResult = await this.customerRepository.findAll(page, limit);

    if (customersResult.isFailure) return customersResult;

    const result: ICustomer[] = customersResult.value.map((customer) =>
      customer.toPrimitives(),
    );

    return Result.success(result);
  }
}
