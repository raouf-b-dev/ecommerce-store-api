import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { GetProductUseCase } from './core/application/usecases/get-product/get-product.usecase';
import {
  POSTGRES_PRODUCT_REPOSITORY,
  CACHED_PRODUCT_REPOSITORY,
} from './product.tokens';
import { ProductRepository } from './core/domain/repositories/product-repository';
import { CachedProductRepository } from './secondary-adapters/repositories/cached-product-repository/cached.product-repository';
import { CacheService } from '../../infrastructure/redis/cache/cache.service';
import { PostgresProductRepository } from './secondary-adapters/repositories/postgres-product-repository/postgres.product-repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { ProductEntity } from './secondary-adapters/orm/product.schema';
import { CreateProductUseCase } from './core/application/usecases/create-product/create-product.usecase';
import { DeleteProductUseCase } from './core/application/usecases/delete-product/delete-product.usecase';
import { ListProductsUseCase } from './core/application/usecases/list-products/list-products.usecase';
import { UpdateProductUseCase } from './core/application/usecases/update-product/update-product.usecase';

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity]), RedisModule],

  controllers: [ProductsController],
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
        cacheService: CacheService,
        postgresRepo: PostgresProductRepository,
      ) => {
        return new CachedProductRepository(cacheService, postgresRepo);
      },
      inject: [CacheService, POSTGRES_PRODUCT_REPOSITORY],
    },

    // Default Repository Binding
    {
      provide: ProductRepository,
      useExisting: CACHED_PRODUCT_REPOSITORY,
    },

    // Usecases
    CreateProductUseCase,
    GetProductUseCase,
    DeleteProductUseCase,
    ListProductsUseCase,
    UpdateProductUseCase,
  ],
  exports: [ProductRepository, GetProductUseCase],
})
export class ProductsModule {}
