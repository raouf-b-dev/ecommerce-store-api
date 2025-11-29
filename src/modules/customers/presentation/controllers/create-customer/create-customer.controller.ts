import { Injectable } from '@nestjs/common';
import { CreateCustomerDto } from '../../dto/create-customer.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { CreateCustomerUseCase } from '../../../application/usecases/create-customer/create-customer.usecase';
import { ICustomer } from '../../../domain/interfaces/customer.interface';

@Injectable()
export class CreateCustomerController {
  constructor(private readonly useCase: CreateCustomerUseCase) {}

  async handle(
    dto: CreateCustomerDto,
  ): Promise<Result<ICustomer, ControllerError>> {
    try {
      const result = await this.useCase.execute(dto);

      if (result.isFailure) {
        return ErrorFactory.ControllerError(result.error.message, result.error);
      }

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
