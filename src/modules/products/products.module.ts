import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { GetProductUseCase } from './application/usecases/GetProduct/get-product.usecase';
import { GetProductController } from './presentation/controllers/GetProduct/get-product.controller';
import {
  POSTGRES_PRODUCT_REPOSITORY,
  REDIS_PRODUCT_REPOSITORY,
} from './product.tokens';
import { ProductRepository } from './domain/repositories/product-repository';
import { RedisProductRepository } from './infrastructure/repositories/RedisProductRepository/redis.product-repository';
import { CacheService } from '../../core/infrastructure/redis/cache/cache.service';
import { PostgresProductRepository } from './infrastructure/repositories/PostgresProductRepository/postgres.product-repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '../../core/infrastructure/redis/redis.module';
import { ProductEntity } from './infrastructure/orm/product.schema';

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
      provide: REDIS_PRODUCT_REPOSITORY,
      useFactory: (
        cacheService: CacheService,
        postgresRepo: PostgresProductRepository,
      ) => {
        return new RedisProductRepository(cacheService, postgresRepo);
      },
      inject: [CacheService, POSTGRES_PRODUCT_REPOSITORY],
    },

    // Default Repository Binding
    {
      provide: ProductRepository,
      useExisting: REDIS_PRODUCT_REPOSITORY,
    },

    GetProductUseCase,
    GetProductController,
  ],
})
export class ProductsModule {}
