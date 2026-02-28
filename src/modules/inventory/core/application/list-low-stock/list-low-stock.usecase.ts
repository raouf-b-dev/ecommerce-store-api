import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { LowStockQueryDto } from '../../../primary-adapters/dto/low-stock-query.dto';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { IInventory } from '../../domain/interfaces/inventory.interface';

@Injectable()
export class ListLowStockUseCase
  implements UseCase<LowStockQueryDto, IInventory[], UseCaseError>
{
  constructor(private inventoryRepository: InventoryRepository) {}

  async execute(
    query: LowStockQueryDto,
  ): Promise<Result<IInventory[], UseCaseError>> {
    try {
      const lowStockResult = await this.inventoryRepository.findLowStock(query);
      if (lowStockResult.isFailure) return lowStockResult;

      const inventories: IInventory[] = lowStockResult.value.map((i) =>
        i.toPrimitives(),
      );

      return Result.success(inventories);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected UseCase Error', error);
    }
  }
}
