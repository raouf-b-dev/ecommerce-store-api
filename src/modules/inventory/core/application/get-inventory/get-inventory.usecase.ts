import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { IInventory } from '../../domain/interfaces/inventory.interface';

@Injectable()
export class GetInventoryUseCase
  implements UseCase<number, IInventory, UseCaseError>
{
  constructor(private inventoryRepository: InventoryRepository) {}

  async execute(productId: number): Promise<Result<IInventory, UseCaseError>> {
    try {
      const inventoryResult =
        await this.inventoryRepository.findByProductId(productId);
      if (inventoryResult.isFailure) return inventoryResult;

      const inventoryPrimitives = inventoryResult.value.toPrimitives();

      return Result.success(inventoryPrimitives);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected UseCase Error', error);
    }
  }
}
