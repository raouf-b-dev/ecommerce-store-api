import { Injectable } from '@nestjs/common';
import { ListPaymentsQueryDto } from '../../dto/list-payments-query.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class ListPaymentsController {
  constructor() {}
  async handle(
    query: ListPaymentsQueryDto,
  ): Promise<Result<void, ControllerError>> {
    try {
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
