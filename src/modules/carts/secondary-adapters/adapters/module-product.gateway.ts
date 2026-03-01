import { Injectable } from '@nestjs/common';
import {
  ProductGateway,
  ProductData,
} from '../../core/application/ports/product.gateway';
import { GetProductUseCase } from '../../../products/core/application/usecases/get-product/get-product.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class ModuleProductGateway implements ProductGateway {
  constructor(private readonly getProductUseCase: GetProductUseCase) {}

  async findById(
    productId: number,
  ): Promise<Result<ProductData | null, InfrastructureError>> {
    const result = await this.getProductUseCase.execute(productId);

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        'Failed to find product',
        result.error,
      );
    }

    const product = result.value;
    return Result.success({
      id: product.id,
      name: product.name,
      price: product.price,
    });
  }
}
