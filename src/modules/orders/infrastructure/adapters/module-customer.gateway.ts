import { Injectable } from '@nestjs/common';
import { CustomerGateway } from '../../application/ports/customer.gateway';
import { GetCustomerUseCase } from '../../../customers/application/usecases/get-customer/get-customer.usecase';
import { Result, isFailure } from '../../../../core/domain/result';
import { ICustomer } from '../../../customers/domain/interfaces/customer.interface';
import { InfrastructureError } from '../../../../core/errors/infrastructure-error';
import { ErrorFactory } from '../../../../core/errors/error.factory';

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
