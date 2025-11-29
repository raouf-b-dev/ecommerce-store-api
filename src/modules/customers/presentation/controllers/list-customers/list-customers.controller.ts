import { Injectable } from '@nestjs/common';
import { ListCustomersQueryDto } from '../../dto/list-customers-query.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ListCustomersUseCase } from '../../../application/usecases/list-customers/list-customers.usecase';
import { ICustomer } from '../../../domain/interfaces/customer.interface';

@Injectable()
export class ListCustomersController {
  constructor(private readonly useCase: ListCustomersUseCase) {}

  async handle(
    query: ListCustomersQueryDto,
  ): Promise<Result<ICustomer[], ControllerError>> {
    try {
      const result = await this.useCase.execute(query);

      if (result.isFailure) {
        return ErrorFactory.ControllerError(result.error.message, result.error);
      }

      const response: ICustomer[] = result.value;

      return Result.success(response);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
