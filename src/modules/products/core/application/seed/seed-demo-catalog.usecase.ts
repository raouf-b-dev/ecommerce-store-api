import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { CreateProductUseCase } from '../usecases/create-product/create-product.usecase';
import { ListProductsUseCase } from '../usecases/list-products/list-products.usecase';
import { DEMO_SEED_PRODUCTS } from './demo-products';

export interface SeededDemoProduct {
  id: number;
  sku: string;
  name: string;
  price: number;
  initialStock: number;
  lowStockThreshold: number;
  status: 'created' | 'existing';
}

@Injectable()
export class SeedDemoCatalogUseCase extends UseCase<
  void,
  SeededDemoProduct[],
  UseCaseError
> {
  constructor(
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly createProductUseCase: CreateProductUseCase,
  ) {
    super();
  }

  async execute(): Promise<Result<SeededDemoProduct[], UseCaseError>> {
    const existingProductsResult = await this.listProductsUseCase.execute();
    if (existingProductsResult.isFailure) {
      return ErrorFactory.UseCaseError(
        'Failed to load existing products',
        existingProductsResult.error,
      );
    }

    const productSkuToIdMap = new Map<string, number>();
    for (const product of existingProductsResult.value.items) {
      if (product.sku && product.id) {
        productSkuToIdMap.set(product.sku, product.id);
      }
    }

    const missingProducts = DEMO_SEED_PRODUCTS.filter(
      (s) => !productSkuToIdMap.has(s.sku),
    );

    const createResults = await Promise.all(
      missingProducts.map((seed) =>
        this.createProductUseCase.execute({
          name: seed.name,
          description: seed.description,
          sku: seed.sku,
          price: seed.price,
        }),
      ),
    );

    for (let i = 0; i < createResults.length; i++) {
      const result = createResults[i];
      if (result.isFailure) {
        return ErrorFactory.UseCaseError(
          `Failed to seed product ${missingProducts[i].sku}`,
          result.error,
        );
      }
    }

    const createdProductMap = new Map<string, number>();
    for (let i = 0; i < missingProducts.length; i++) {
      const result = createResults[i];
      if (result.isSuccess) {
        const id = result.value.id;
        if (id != null) {
          createdProductMap.set(missingProducts[i].sku, id);
        }
      }
    }

    const seededProducts: SeededDemoProduct[] = DEMO_SEED_PRODUCTS.map(
      (seed) => {
        const existingId = productSkuToIdMap.get(seed.sku);
        const createdId = createdProductMap.get(seed.sku);
        return {
          id: (existingId ?? createdId)!,
          sku: seed.sku,
          name: seed.name,
          price: seed.price,
          initialStock: seed.initialStock,
          lowStockThreshold: seed.lowStockThreshold,
          status: existingId ? ('existing' as const) : ('created' as const),
        };
      },
    );

    return Result.success(seededProducts);
  }
}
