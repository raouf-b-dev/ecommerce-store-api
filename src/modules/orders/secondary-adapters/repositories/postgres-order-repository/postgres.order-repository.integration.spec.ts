import { OrderEntityTestFactory } from 'src/modules/orders/testing';
import { PostgresOrderRepository } from './postgres.order-repository';
import { OrderEntity } from '../../orm/order.schema';
import { OrderItemEntity } from '../../orm/order-item.schema';
import { ShippingAddressEntity } from '../../orm/shipping-address.schema';
import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { SeededData } from 'test/integration/harness/seed-reference-data';
import { OrderMapper } from '../../persistence/mappers/order.mapper';
import { OrderStatus } from '../../../core/domain/value-objects/order-status';
import { ResultAssertionHelper } from 'src/testing';

describe('PostgresOrderRepository (Integration - Real DB)', () => {
  let repository: PostgresOrderRepository;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    repository = new PostgresOrderRepository(
      dataSource.getRepository(OrderEntity),
      dataSource,
    );
  });

  const persistOrder = async (
    overrides: Partial<OrderEntity> = {},
  ): Promise<OrderEntity> => {
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
          ...overrides,
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

  it('findByIdForUpdate returns order with expectedVersion from database', async () => {
    const orderEntity = await persistOrder();

    const result = await repository.findByIdForUpdate(orderEntity.id);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.entity.id).toBe(orderEntity.id);
    expect(result.value.expectedVersion).toBe(orderEntity.version);
  });

  it('save persists order aggregate', async () => {
    const orderEntity = await persistOrder();
    const domain = OrderMapper.toDomain(orderEntity);

    const result = await repository.save(domain);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.id).toBe(orderEntity.id);
  });

  it('listOrders filters by userId and status', async () => {
    await persistOrder({
      userId: seededData.customerUser.id,
      status: OrderStatus.PENDING_PAYMENT,
    });
    await persistOrder({
      userId: seededData.adminUser.id,
      status: OrderStatus.CONFIRMED,
    });

    const result = await repository.listOrders({
      userId: seededData.customerUser.id,
      status: OrderStatus.PENDING_PAYMENT,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toHaveLength(1);
    expect(result.value[0].userId).toBe(seededData.customerUser.id);
    expect(result.value[0].status).toBe(OrderStatus.PENDING_PAYMENT);
  });

  it('save with expectedVersion persists status change and keeps items', async () => {
    const orderEntity = await persistOrder();
    const forUpdate = await repository.findByIdForUpdate(orderEntity.id);
    ResultAssertionHelper.assertResultSuccess(forUpdate);

    ResultAssertionHelper.assertResultSuccess(
      forUpdate.value.entity.confirmPayment(42),
    );

    const saveResult = await repository.save(
      forUpdate.value.entity,
      forUpdate.value.expectedVersion,
    );
    ResultAssertionHelper.assertResultSuccess(saveResult);

    const loaded = await repository.findById(orderEntity.id);
    ResultAssertionHelper.assertResultSuccess(loaded);
    expect(loaded.value.status).toBe(OrderStatus.CONFIRMED);
    expect(loaded.value.paymentId).toBe(42);
    expect(loaded.value.getItems()).toHaveLength(1);

    const after = await repository.findByIdForUpdate(orderEntity.id);
    ResultAssertionHelper.assertResultSuccess(after);
    expect(after.value.expectedVersion).toBeGreaterThan(
      forUpdate.value.expectedVersion,
    );
  });

  it('save with stale expectedVersion does not change status or items', async () => {
    const orderEntity = await persistOrder();
    const forUpdate = await repository.findByIdForUpdate(orderEntity.id);
    ResultAssertionHelper.assertResultSuccess(forUpdate);

    ResultAssertionHelper.assertResultSuccess(
      forUpdate.value.entity.confirmPayment(7),
    );

    const firstSave = await repository.save(
      forUpdate.value.entity,
      forUpdate.value.expectedVersion,
    );
    ResultAssertionHelper.assertResultSuccess(firstSave);

    ResultAssertionHelper.assertResultSuccess(firstSave.value.process());

    const staleSave = await repository.save(
      firstSave.value,
      forUpdate.value.expectedVersion,
    );
    ResultAssertionHelper.assertResultFailure(
      staleSave,
      'Optimistic lock failure',
    );

    const loaded = await repository.findById(orderEntity.id);
    ResultAssertionHelper.assertResultSuccess(loaded);
    expect(loaded.value.status).toBe(OrderStatus.CONFIRMED);
    expect(loaded.value.getItems()).toHaveLength(1);
  });
});
