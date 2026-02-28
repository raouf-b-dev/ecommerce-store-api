import { Injectable } from '@nestjs/common';
import { CustomerGateway } from '../../core/application/ports/customer.gateway';
import { GetCustomerUseCase } from '../../../customers/core/application/usecases/get-customer/get-customer.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { ICustomer } from '../../../customers/core/domain/interfaces/customer.interface';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class ModuleCustomerGateway implements CustomerGateway {
  constructor(private readonly getCustomerUseCase: GetCustomerUseCase) {}

  async validateCustomer(
    userId: number,
  ): Promise<Result<ICustomer, InfrastructureError>> {
    const result = await this.getCustomerUseCase.execute(userId);

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        'Failed to validate customer',
        result.error,
      );
    }

    return Result.success(result.value);
  }
}
