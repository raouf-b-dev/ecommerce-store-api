import { OrderEntityTestFactory } from 'src/modules/orders/testing';
import { CachedOrderRepository } from './cached.order-repository';
import { PostgresOrderRepository } from '../postgres-order-repository/postgres.order-repository';
import { OrderEntity } from '../../orm/order.schema';
import { OrderItemEntity } from '../../orm/order-item.schema';
import { ShippingAddressEntity } from '../../orm/shipping-address.schema';
import {
  OrderCacheMapper,
  OrderForCache,
  OrderMapper,
} from '../../persistence/mappers/order.mapper';
import { IntegrationTestHelper } from 'test/integration/setup/integration-test.helper';
import { SeededData } from 'test/integration/setup/seed-reference-data';
import { MockCacheService, MockLogger } from 'src/testing';
import { ORDER_REDIS } from 'src/infrastructure/redis/constants/redis.constants';
import { ResultAssertionHelper } from 'src/testing';

describe('CachedOrderRepository (Integration - Real DB delegate)', () => {
  let repository: CachedOrderRepository;
  let cacheService: MockCacheService;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    const postgresRepo = new PostgresOrderRepository(
      dataSource.getRepository(OrderEntity),
      dataSource,
    );
    cacheService = new MockCacheService();
    repository = new CachedOrderRepository(
      cacheService,
      postgresRepo,
      new MockLogger(),
    );
  });

  const persistOrder = async (): Promise<OrderEntity> => {
    const orderRepo = IntegrationTestHelper.getRepository(OrderEntity);
    const itemRepo = IntegrationTestHelper.getRepository(OrderItemEntity);
    const shippingAddressRepo = IntegrationTestHelper.getRepository(
      ShippingAddressEntity,
    );

    const shippingAddress = await shippingAddressRepo.save(
      shippingAddressRepo.create(
        OrderEntityTestFactory.createShippingAddressEntity({ id: undefined }),
      ),
    );

    const order = await orderRepo.save(
      orderRepo.create(
        OrderEntityTestFactory.createUnsavedOrderEntity({
          userId: seededData.customerUser.id,
          shippingAddressId: shippingAddress.id,
        }),
      ),
    );

    await itemRepo.save(
      itemRepo.create(
        OrderEntityTestFactory.createUnsavedOrderItemEntity({
          order,
          productId: seededData.product.id,
          productName: seededData.product.name,
          sku: seededData.product.sku,
        }),
      ),
    );

    return orderRepo.findOneOrFail({
      where: { id: order.id },
      relations: ['items', 'shippingAddress'],
    });
  };

  it('listOrders fetches from postgres on cache miss and sets cache flag', async () => {
    await persistOrder();
    cacheService.get.mockResolvedValue(null);

    const result = await repository.listOrders({ page: 1, limit: 10 });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toHaveLength(1);
    expect(cacheService.set).toHaveBeenCalledWith(
      ORDER_REDIS.IS_CACHED_FLAG,
      'true',
      { ttl: ORDER_REDIS.EXPIRATION },
    );
    expect(cacheService.setAll).toHaveBeenCalled();
  });

  it('listOrders returns cached list when cache flag is set', async () => {
    const orderEntity = await persistOrder();
    const cachedOrder: OrderForCache = OrderCacheMapper.toCache(
      OrderMapper.toDomain(orderEntity),
    );

    cacheService.get.mockImplementation((key: string) => {
      if (key === ORDER_REDIS.IS_CACHED_FLAG) return Promise.resolve('true');
      return Promise.resolve(null);
    });
    cacheService.getAll.mockResolvedValue([cachedOrder]);

    const result = await repository.listOrders({ page: 1, limit: 10 });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toHaveLength(1);
    expect(result.value[0].id).toBe(orderEntity.id);
    expect(cacheService.getAll).toHaveBeenCalled();
  });

  it('listOrders falls back to postgres when cache lookup throws', async () => {
    await persistOrder();
    cacheService.get.mockRejectedValue(new Error('Redis unavailable'));

    const result = await repository.listOrders({ page: 1, limit: 10 });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toHaveLength(1);
  });

  it('save persists to postgres and invalidates list cache flag', async () => {
    const orderEntity = await persistOrder();
    const domain = OrderMapper.toDomain(orderEntity);

    const result = await repository.save(domain);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(cacheService.delete).toHaveBeenCalledWith(
      ORDER_REDIS.IS_CACHED_FLAG,
    );
  });
});
