import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { isFailure, Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { CreateProductUseCase } from '../usecases/create-product/create-product.usecase';
import { UpdateProductUseCase } from '../usecases/update-product/update-product.usecase';
import { UpdateProductCommand } from '../commands/update-product.command';
import { CategoryRepository } from '../../domain/repositories/category-repository';
import { ProductRepository } from '../../domain/repositories/product-repository';
import { DEMO_SEED_PRODUCTS } from './demo-products';
import { buildDemoImageUrl, resolveDemoImageUrl } from './demo-media';

export interface SeedDemoCatalogInput {
  /** Absolute origin the API is reachable at, used to build demo image URLs. */
  publicBaseUrl: string;
}

export interface SeededDemoProduct {
  id: number;
  sku: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string;
  initialStock: number;
  lowStockThreshold: number;
  status: 'created' | 'existing';
}

@Injectable()
export class SeedDemoCatalogUseCase extends UseCase<
  SeedDemoCatalogInput,
  SeededDemoProduct[],
  UseCaseError
> {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
  ) {
    super();
  }

  async execute({
    publicBaseUrl,
  }: SeedDemoCatalogInput): Promise<Result<SeededDemoProduct[], UseCaseError>> {
    const categoriesResult = await this.categoryRepository.findAll();
    if (isFailure(categoriesResult)) {
      return ErrorFactory.UseCaseError(
        'Failed to load categories for catalog seed',
        categoriesResult.error,
      );
    }

    const categoryIdBySlug = new Map<string, number>();
    for (const category of categoriesResult.value) {
      if (category.id == null || !category.isActive) {
        continue;
      }
      categoryIdBySlug.set(category.slug, category.id);
    }

    for (const seed of DEMO_SEED_PRODUCTS) {
      if (!categoryIdBySlug.has(seed.categorySlug)) {
        return ErrorFactory.UseCaseError(
          `Demo category slug ${seed.categorySlug} is missing or inactive`,
        );
      }
    }

    const existingProductsResult = await this.productRepository.findAll();
    if (isFailure(existingProductsResult)) {
      return ErrorFactory.UseCaseError(
        'Failed to load existing products',
        existingProductsResult.error,
      );
    }

    const existingBySku = new Map<
      string,
      {
        id: number;
        categoryId: number | null;
        currency: string;
        imageUrl: string | null;
      }
    >();
    for (const product of existingProductsResult.value) {
      if (product.sku && product.id != null) {
        existingBySku.set(product.sku, {
          id: product.id,
          categoryId: product.categoryId ?? null,
          currency: product.currency,
          imageUrl: product.imageUrl ?? null,
        });
      }
    }

    const seeds = DEMO_SEED_PRODUCTS.map((seed) => ({
      ...seed,
      imageUrl: resolveDemoImageUrl(
        existingBySku.get(seed.sku)?.imageUrl ?? null,
        buildDemoImageUrl(publicBaseUrl, seed.sku),
      ),
    }));

    const missingProducts = seeds.filter((s) => !existingBySku.has(s.sku));

    const createResults = await Promise.all(
      missingProducts.map((seed) =>
        this.createProductUseCase.execute({
          name: seed.name,
          description: seed.description,
          sku: seed.sku,
          price: seed.price,
          currency: seed.currency,
          categoryId: categoryIdBySlug.get(seed.categorySlug)!,
          imageUrl: seed.imageUrl,
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

    const updates: { sku: string; patch: UpdateProductCommand }[] = [];

    for (const seed of seeds) {
      const existing = existingBySku.get(seed.sku);
      if (!existing) {
        continue;
      }
      const patch: UpdateProductCommand = { id: existing.id };
      if (existing.categoryId == null) {
        patch.categoryId = categoryIdBySlug.get(seed.categorySlug)!;
      }
      if (seed.imageUrl !== existing.imageUrl) {
        patch.imageUrl = seed.imageUrl;
      }
      if (patch.categoryId !== undefined || patch.imageUrl !== undefined) {
        updates.push({ sku: seed.sku, patch });
      }
    }

    const updateResults = await Promise.all(
      updates.map(({ patch }) => this.updateProductUseCase.execute(patch)),
    );

    for (let i = 0; i < updateResults.length; i++) {
      const result = updateResults[i];
      if (result.isFailure) {
        return ErrorFactory.UseCaseError(
          `Failed to refresh demo product ${updates[i].sku}`,
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

    const seededProducts: SeededDemoProduct[] = seeds.map((seed) => {
      const existing = existingBySku.get(seed.sku);
      const createdId = createdProductMap.get(seed.sku);
      return {
        id: (existing?.id ?? createdId)!,
        sku: seed.sku,
        name: seed.name,
        price: seed.price,
        currency: existing?.currency ?? seed.currency,
        imageUrl: seed.imageUrl,
        initialStock: seed.initialStock,
        lowStockThreshold: seed.lowStockThreshold,
        status: existing ? ('existing' as const) : ('created' as const),
      };
    });

    return Result.success(seededProducts);
  }
}
