import { Injectable } from '@nestjs/common';
import { LowStockQueryDto } from '../../dto/low-stock-query.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class ListLowStockController {
  constructor() {}
  async handle(
    query: LowStockQueryDto,
  ): Promise<Result<void, ControllerError>> {
    try {
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
