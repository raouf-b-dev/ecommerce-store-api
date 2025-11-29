import { Injectable } from '@nestjs/common';
import { UpdateCustomerDto } from '../../dto/update-customer.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { UpdateCustomerUseCase } from '../../../application/usecases/update-customer/update-customer.usecase';
import { ICustomer } from '../../../domain/interfaces/customer.interface';

@Injectable()
export class UpdateCustomerController {
  constructor(private readonly useCase: UpdateCustomerUseCase) {}

  async handle(
    id: string,
    dto: UpdateCustomerDto,
  ): Promise<Result<ICustomer, ControllerError>> {
    try {
      const result = await this.useCase.execute({ id, dto });

      if (result.isFailure) {
        return ErrorFactory.ControllerError(result.error.message, result.error);
      }

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
