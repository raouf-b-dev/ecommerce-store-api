import { Injectable } from '@nestjs/common';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { UseCaseError } from '../../../../core/errors/usecase.error';
import { Result } from '../../../../core/domain/result';
import { UseCase } from '../../../../core/application/use-cases/base.usecase';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { CheckStockResponse } from '../../presentation/dto/check-stock-response.dto';

@Injectable()
export class CheckStockUseCase
  implements
    UseCase<
      { productId: number; quantity?: number },
      CheckStockResponse,
      UseCaseError
    >
{
  constructor(private inventoryRepository: InventoryRepository) {}

  async execute(dto: {
    productId: number;
    quantity?: number;
  }): Promise<Result<CheckStockResponse, UseCaseError>> {
    try {
      const requestedQuantity = dto.quantity ?? 1;

      const inventoryResult = await this.inventoryRepository.findByProductId(
        dto.productId,
      );
      if (inventoryResult.isFailure) return inventoryResult;

      const inventory = inventoryResult.value;

      const checkStockResult = inventory.isInStock(requestedQuantity);
      if (checkStockResult.isFailure) return checkStockResult;

      return Result.success({
        isAvailable: checkStockResult.value,
        availableQuantity: inventory.availableQuantity,
        requestedQuantity,
      });
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected UseCase Error', error);
    }
  }
}
