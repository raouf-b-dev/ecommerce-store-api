import { Injectable } from '@nestjs/common';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { GetCustomerUseCase } from '../../../application/usecases/get-customer/get-customer.usecase';
import { ICustomer } from '../../../domain/interfaces/customer.interface';

@Injectable()
export class GetCustomerController {
  constructor(private readonly useCase: GetCustomerUseCase) {}

  async handle(id: number): Promise<Result<ICustomer, ControllerError>> {
    try {
      const result = await this.useCase.execute(id);

      if (result.isFailure) {
        return ErrorFactory.ControllerError(result.error.message, result.error);
      }

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
