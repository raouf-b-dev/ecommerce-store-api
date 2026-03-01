import { Injectable } from '@nestjs/common';
import {
  CustomerGateway,
  CreateCustomerInput,
  CustomerRecord,
} from '../../core/application/ports/customer.gateway';
import { CreateCustomerUseCase } from '../../../customers/core/application/usecases/create-customer/create-customer.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class ModuleCustomerGateway implements CustomerGateway {
  constructor(private readonly createCustomerUseCase: CreateCustomerUseCase) {}

  async createCustomer(
    input: CreateCustomerInput,
  ): Promise<Result<CustomerRecord, InfrastructureError>> {
    const result = await this.createCustomerUseCase.execute({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
    });

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        'Failed to create customer',
        result.error,
      );
    }

    return Result.success({ id: result.value.id });
  }
}
