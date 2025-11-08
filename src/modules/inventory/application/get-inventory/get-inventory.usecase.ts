import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../core/application/use-cases/base.usecase';
import { Result } from '../../../../core/domain/result';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { UseCaseError } from '../../../../core/errors/usecase.error';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { IInventory } from '../../domain/interfaces/inventory.interface';

@Injectable()
export class GetInventoryUseCase
  implements UseCase<string, IInventory, UseCaseError>
{
  constructor(private inventoryRepository: InventoryRepository) {}

  async execute(productId: string): Promise<Result<IInventory, UseCaseError>> {
    try {
      const getInventoryResult =
        await this.inventoryRepository.findByProductId(productId);

      if (getInventoryResult.isFailure) return getInventoryResult;
      const inventoryPrimitives = getInventoryResult.value.toPrimitives();

      return Result.success(inventoryPrimitives);
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected UseCase Error', error);
    }
  }
}
