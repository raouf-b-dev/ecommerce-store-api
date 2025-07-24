import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { GetOrderController } from './presentation/controllers/getOrder.controller';
import { GetOrderUseCase } from './application/use-cases/getOrder.usecase';
import {
  POSTGRES_ORDER_REPOSITORY,
  REDIS_ORDER_REPOSITORY,
} from './order.token';
import { OrderRepository } from './domain/repositories/order-repository';
import { RedisOrderRepository } from './infrastructure/repositories/redis.order-repository';
import { PostgresOrderRepository } from './infrastructure/repositories/postgres.order-repository';

describe('OrdersController', () => {
  let controller: OrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        // External Repos

        // Postgres Repo
        {
          provide: POSTGRES_ORDER_REPOSITORY,
          useFactory: () => {
            return new PostgresOrderRepository();
          },
          inject: [],
        },

        // Redis Repo
        {
          provide: REDIS_ORDER_REPOSITORY,
          useFactory: (pgRepo: PostgresOrderRepository) =>
            new RedisOrderRepository(pgRepo),
          inject: [POSTGRES_ORDER_REPOSITORY],
        },

        // Interface Bindings
        {
          provide: OrderRepository,
          useExisting: REDIS_ORDER_REPOSITORY,
        },

        // Usecases
        GetOrderUseCase,

        // Controllers
        GetOrderController,
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
