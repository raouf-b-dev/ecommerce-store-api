// src/modules/customers/application/usecases/get-customer/get-customer.usecase.ts
import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../../domain/repositories/customer.repository';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ICustomer } from '../../../domain/interfaces/customer.interface';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  CUSTOMER_ACCESS_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';

export interface GetCustomerInput {
  customerId: number;
  callerContext: CallerContext;
}

@Injectable()
export class GetCustomerUseCase extends UseCase<
  GetCustomerInput,
  ICustomer,
  UseCaseError
> {
  constructor(private readonly customerRepository: CustomerRepository) {
    super();
  }

  async execute(
    input: GetCustomerInput,
  ): Promise<Result<ICustomer, UseCaseError>> {
    const { customerId, callerContext } = input;

    if (
      !OwnedResourceAccessPolicy.canViewResource(
        callerContext,
        customerId,
        CUSTOMER_ACCESS_PERMISSIONS,
      )
    ) {
      return ErrorFactory.UseCaseError(
        `Customer with id ${customerId} not found`,
      );
    }

    const customerResult = await this.customerRepository.findById(customerId);

    if (isFailure(customerResult)) return customerResult;

    return Result.success(customerResult.value.toPrimitives());
  }
}
