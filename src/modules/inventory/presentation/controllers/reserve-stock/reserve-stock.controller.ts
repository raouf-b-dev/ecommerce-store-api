import { Injectable } from '@nestjs/common';
import { ReserveStockDto } from '../../dto/reserve-stock.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ReserveStockUseCase } from '../../../application/reserve-stock/reserve-stock.usecase';

import { StockReservationResponseDto } from '../../dto/stock-reservation-response.dto';

@Injectable()
export class ReserveStockController {
  constructor(private reserveStockUseCase: ReserveStockUseCase) {}
  async handle(
    dto: ReserveStockDto,
  ): Promise<Result<StockReservationResponseDto, ControllerError>> {
    try {
      const result = await this.reserveStockUseCase.execute(dto);
      if (result.isFailure) return result;

      const reservation = result.value;
      const response: StockReservationResponseDto = {
        reservationId: reservation.id!,
        orderId: reservation.orderId,
        expiresAt: reservation.expiresAt,
        success: true,
      };

      return Result.success(response);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
