import { Injectable } from '@nestjs/common';
import { ReserveStockDto } from '../../dto/reserve-stock.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class ReserveStockController {
  constructor() {}
  async handle(dto: ReserveStockDto): Promise<Result<void, ControllerError>> {
    try {
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
