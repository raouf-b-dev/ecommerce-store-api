import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ProductQueryService } from '../../ports/product-query.service';
import { ProductDetailDTO } from '../../queries/results/product-detail.result';

@Injectable()
export class GetProductUseCase extends UseCase<
  number,
  ProductDetailDTO,
  UseCaseError
> {
  constructor(private readonly productQueryService: ProductQueryService) {
    super();
  }

  async execute(id: number): Promise<Result<ProductDetailDTO, UseCaseError>> {
    const result = await this.productQueryService.getById(id);

    if (isFailure(result) || !result.value) {
      return ErrorFactory.UseCaseError(`Product with id ${id} not found`);
    }

    return Result.success(result.value);
  }
}
