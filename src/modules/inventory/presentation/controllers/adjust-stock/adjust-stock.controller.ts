import { Injectable } from '@nestjs/common';
import { AdjustStockDto } from '../../dto/adjust-stock.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class AdjustStockController {
  constructor() {}
  async handle(
    productId: string,
    dto: AdjustStockDto,
  ): Promise<Result<void, ControllerError>> {
    try {
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
