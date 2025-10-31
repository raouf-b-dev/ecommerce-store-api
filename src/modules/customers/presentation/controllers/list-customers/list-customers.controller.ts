import { Injectable } from '@nestjs/common';
import { ListCustomersQueryDto } from '../../dto/list-customers-query.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class ListCustomersController {
  constructor() {}
  async handle(
    query: ListCustomersQueryDto,
  ): Promise<Result<void, ControllerError>> {
    try {
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
