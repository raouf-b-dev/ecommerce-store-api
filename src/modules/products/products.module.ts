import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { CategoriesController } from './categories.controller';
import { GetProductUseCase } from './core/application/usecases/get-product/get-product.usecase';
import {
  POSTGRES_PRODUCT_REPOSITORY,
  CACHED_PRODUCT_REPOSITORY,
  POSTGRES_CATEGORY_REPOSITORY,
} from './product.tokens';
import { ProductRepository } from './core/domain/repositories/product-repository';
import { CategoryRepository } from './core/domain/repositories/category-repository';
import { CachedProductRepository } from './secondary-adapters/repositories/cached-product-repository/cached.product-repository';
import { CachePort } from '../../shared-kernel/domain/interfaces/cache.port';
import { PostgresProductRepository } from './secondary-adapters/repositories/postgres-product-repository/postgres.product-repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { ProductEntity } from './secondary-adapters/orm/product.schema';
import { CategoryEntity } from './secondary-adapters/orm/category.schema';
import { PostgresCategoryRepository } from './secondary-adapters/repositories/postgres-category-repository/postgres.category-repository';
import { ListCategoriesUseCase } from './core/application/usecases/categories/list-categories.usecase';
import { GetCategoryUseCase } from './core/application/usecases/categories/get-category.usecase';
import { CreateCategoryUseCase } from './core/application/usecases/categories/create-category.usecase';
import { UpdateCategoryUseCase } from './core/application/usecases/categories/update-category.usecase';
import { DeleteCategoryUseCase } from './core/application/usecases/categories/delete-category.usecase';
import { ActivateCategoryUseCase } from './core/application/usecases/categories/activate-category.usecase';
import { DeactivateCategoryUseCase } from './core/application/usecases/categories/deactivate-category.usecase';
import { CreateProductUseCase } from './core/application/usecases/create-product/create-product.usecase';
import { DeleteProductUseCase } from './core/application/usecases/delete-product/delete-product.usecase';
import { ListProductsUseCase } from './core/application/usecases/list-products/list-products.usecase';
import { UpdateProductUseCase } from './core/application/usecases/update-product/update-product.usecase';
import { ActivateProductUseCase } from './core/application/usecases/activate-product/activate-product.usecase';
import { DeactivateProductUseCase } from './core/application/usecases/deactivate-product/deactivate-product.usecase';
import { SeedDemoCatalogUseCase } from './core/application/seed/seed-demo-catalog.usecase';
import { SeedDemoCategoriesUseCase } from './core/application/seed/seed-demo-categories.usecase';

import { ProductQueryService } from './core/application/ports/product-query.service';
import { PostgresProductQueryAdapter } from './secondary-adapters/query/postgres-product-query.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEntity, CategoryEntity]),
    RedisModule,
  ],

  controllers: [ProductsController, CategoriesController],
  providers: [
    //Postgres Repo
    {
      provide: POSTGRES_PRODUCT_REPOSITORY,
      useClass: PostgresProductRepository,
    },

    // Redis Repo (decorator around Postgres)
    {
      provide: CACHED_PRODUCT_REPOSITORY,
      useFactory: (
        cacheService: CachePort,
        postgresRepo: PostgresProductRepository,
      ) => {
        return new CachedProductRepository(cacheService, postgresRepo);
      },
      inject: [CachePort, POSTGRES_PRODUCT_REPOSITORY],
    },

    // Default Repository Binding - cache-aside fails open via CachePort
    {
      provide: ProductRepository,
      useExisting: CACHED_PRODUCT_REPOSITORY,
    },

    {
      provide: POSTGRES_CATEGORY_REPOSITORY,
      useClass: PostgresCategoryRepository,
    },
    {
      provide: CategoryRepository,
      useExisting: POSTGRES_CATEGORY_REPOSITORY,
    },

    // Usecases
    CreateProductUseCase,
    GetProductUseCase,
    DeleteProductUseCase,
    ListProductsUseCase,
    UpdateProductUseCase,
    ActivateProductUseCase,
    DeactivateProductUseCase,
    SeedDemoCategoriesUseCase,
    SeedDemoCatalogUseCase,
    ListCategoriesUseCase,
    GetCategoryUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    ActivateCategoryUseCase,
    DeactivateCategoryUseCase,

    // CQRS Presentation Query Service
    {
      provide: ProductQueryService,
      useClass: PostgresProductQueryAdapter,
    },
  ],
  exports: [ProductRepository, GetProductUseCase, ProductQueryService],
})
export class ProductsModule {}
