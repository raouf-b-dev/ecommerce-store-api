import { Injectable } from '@nestjs/common';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { DeleteCustomerUseCase } from '../../../application/usecases/delete-customer/delete-customer.usecase';

@Injectable()
export class DeleteCustomerController {
  constructor(private readonly useCase: DeleteCustomerUseCase) {}

  async handle(id: string): Promise<Result<void, ControllerError>> {
    try {
      const result = await this.useCase.execute(id);

      if (result.isFailure) {
        return ErrorFactory.ControllerError(result.error.message, result.error);
      }

      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
