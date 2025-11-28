import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartsController } from './carts.controller';
import { AddCartItemController } from './presentation/controllers/add-cart-item/add-cart-item.controller';
import { ClearCartController } from './presentation/controllers/clear-cart/clear-cart.controller';
import { CreateCartController } from './presentation/controllers/create-cart/create-cart.controller';
import { GetCartController } from './presentation/controllers/get-cart/get-cart.controller';
import { MergeCartsController } from './presentation/controllers/merge-carts/merge-carts.controller';
import { RemoveCartItemController } from './presentation/controllers/remove-cart-item/remove-cart-item.controller';
import { UpdateCartItemController } from './presentation/controllers/update-cart-item/update-cart-item.controller';
import { CartEntity } from './infrastructure/orm/cart.schema';
import { CartItemEntity } from './infrastructure/orm/cart-item.schema';
import { RedisModule } from '../../core/infrastructure/redis/redis.module';
import { CoreModule } from '../../core/core.module';
import { POSTGRES_CART_REPOSITORY, REDIS_CART_REPOSITORY } from './carts.token';
import { PostgresCartRepository } from './infrastructure/repositories/postgres-cart-repository/postgres.cart-repository';
import { RedisCartRepository } from './infrastructure/repositories/redis-cart-repository/redis.cart-repository';
import { CacheService } from '../../core/infrastructure/redis/cache/cache.service';
import { CartRepository } from './domain/repositories/cart.repository';
import { InventoryModule } from '../inventory/inventory.module';
import { GetCartUseCase } from './application/usecases/get-cart/get-cart.usecase';
import { CreateCartUseCase } from './application/usecases/create-cart/create-cart.usecase';
import { AddCartItemUseCase } from './application/usecases/add-cart-item/add-cart-item.usecase';
import { UpdateCartItemUseCase } from './application/usecases/update-cart-item/update-cart-item.usecase';
import { RemoveCartItemUseCase } from './application/usecases/remove-cart-item/remove-cart-item.usecase';
import { ClearCartUseCase } from './application/usecases/clear-cart/clear-cart.usecase';
import { MergeCartsUseCase } from './application/usecases/merge-carts/merge-carts.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([CartEntity, CartItemEntity]),
    RedisModule,
    RedisModule,
    CoreModule,
    InventoryModule,
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

    // Default Repository Binding
    {
      provide: CartRepository,
      useExisting: REDIS_CART_REPOSITORY,
    },

    // Controllers
    GetCartController,
    CreateCartController,
    AddCartItemController,
    UpdateCartItemController,
    RemoveCartItemController,
    ClearCartController,
    MergeCartsController,
    MergeCartsController,

    // Use Cases
    GetCartUseCase,
    CreateCartUseCase,
    AddCartItemUseCase,
    UpdateCartItemUseCase,
    RemoveCartItemUseCase,
    ClearCartUseCase,
    MergeCartsUseCase,
  ],
})
export class CartsModule {}
