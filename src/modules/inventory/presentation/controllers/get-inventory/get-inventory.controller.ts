import { Injectable } from '@nestjs/common';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { GetInventoryUseCase } from '../../../application/get-inventory/get-inventory.usecase';
import { IInventory } from '../../../domain/interfaces/inventory.interface';

@Injectable()
export class GetInventoryController {
  constructor(private getInventoryUseCase: GetInventoryUseCase) {}
  async handle(
    productId: number,
  ): Promise<Result<IInventory, ControllerError>> {
    try {
      const result = await this.getInventoryUseCase.execute(productId);
      if (result.isFailure) return result;

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
