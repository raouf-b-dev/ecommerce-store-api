import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartsController } from './carts.controller';
import { CartEntity } from './secondary-adapters/orm/cart.schema';
import { CartItemEntity } from './secondary-adapters/orm/cart-item.schema';
import { RedisModule } from '../../shared-kernel/infrastructure/redis/redis.module';
import {
  POSTGRES_CART_REPOSITORY,
  REDIS_CART_REPOSITORY,
  INVENTORY_GATEWAY,
} from './carts.token';
import { PostgresCartRepository } from './secondary-adapters/repositories/postgres-cart-repository/postgres.cart-repository';
import { RedisCartRepository } from './secondary-adapters/repositories/redis-cart-repository/redis.cart-repository';
import { ModuleInventoryGateway } from './secondary-adapters/adapters/module-inventory.gateway';
import { CacheService } from '../../shared-kernel/infrastructure/redis/cache/cache.service';
import { CartRepository } from './core/domain/repositories/cart.repository';
import { InventoryModule } from '../inventory/inventory.module';
import { GetCartUseCase } from './core/application/usecases/get-cart/get-cart.usecase';
import { CreateCartUseCase } from './core/application/usecases/create-cart/create-cart.usecase';
import { AddCartItemUseCase } from './core/application/usecases/add-cart-item/add-cart-item.usecase';
import { UpdateCartItemUseCase } from './core/application/usecases/update-cart-item/update-cart-item.usecase';
import { RemoveCartItemUseCase } from './core/application/usecases/remove-cart-item/remove-cart-item.usecase';
import { ClearCartUseCase } from './core/application/usecases/clear-cart/clear-cart.usecase';
import { MergeCartsUseCase } from './core/application/usecases/merge-carts/merge-carts.usecase';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CartEntity, CartItemEntity]),
    RedisModule,
    RedisModule, // Notice default code had this twice, keeping consistent
    InventoryModule,
    ProductsModule,
  ],
  controllers: [CartsController],
  providers: [
    // Postgres Repo
    {
      provide: POSTGRES_CART_REPOSITORY,
      useClass: PostgresCartRepository,
    },

    // Redis Repo (decorator around Postgres)
    {
      provide: REDIS_CART_REPOSITORY,
      useFactory: (
        cacheService: CacheService,
        postgresRepo: PostgresCartRepository,
      ) => {
        return new RedisCartRepository(
          cacheService,
          postgresRepo,
          new Logger(RedisCartRepository.name),
        );
      },
      inject: [CacheService, POSTGRES_CART_REPOSITORY],
    },

    // Gateways
    {
      provide: INVENTORY_GATEWAY,
      useClass: ModuleInventoryGateway,
    },

    // Default Repository Binding
    {
      provide: CartRepository,
      useExisting: REDIS_CART_REPOSITORY,
    },

    // Use Cases
    GetCartUseCase,
    CreateCartUseCase,
    AddCartItemUseCase,
    UpdateCartItemUseCase,
    RemoveCartItemUseCase,
    ClearCartUseCase,
    MergeCartsUseCase,
  ],
  exports: [GetCartUseCase, ClearCartUseCase],
})
export class CartsModule {}
