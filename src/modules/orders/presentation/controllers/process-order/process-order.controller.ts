import { Injectable } from '@nestjs/common';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ProcessOrderUseCase } from '../../../application/usecases/process-order/process-order.usecase';
import { IOrder } from '../../../domain/interfaces/order.interface';

@Injectable()
export class ProcessOrderController {
  constructor(private processOrderUseCase: ProcessOrderUseCase) {}
  async handle(id: number): Promise<Result<IOrder, ControllerError>> {
    try {
      const processRequest = await this.processOrderUseCase.execute(id);
      if (processRequest.isFailure) return processRequest;
      return Result.success(processRequest.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
