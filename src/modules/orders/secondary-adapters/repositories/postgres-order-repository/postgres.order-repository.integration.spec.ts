// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import {
  OrderEntityTestFactory,
  OrderTestFactory,
} from 'src/modules/orders/testing';
import { PostgresOrderRepository } from './postgres.order-repository';
import { OrderEntity } from '../../orm/order.schema';
import { OrderItemEntity } from '../../orm/order-item.schema';
import { ShippingAddressEntity } from '../../orm/shipping-address.schema';
import { ProductEntity } from 'src/modules/products/secondary-adapters/orm/product.schema';
import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { SeededData } from 'test/integration/harness/seed-reference-data';
import { OrderMapper } from '../../persistence/mappers/order.mapper';
import { Order } from '../../../core/domain/entities/order';
import { OrderStatus } from '../../../core/domain/value-objects/order-status';
import { PaymentMethodType } from '../../../../../shared-kernel/domain/value-objects/payment-method';
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

  it('saveNormally persists all line items for a new order', async () => {
    const productRepo = IntegrationTestHelper.getRepository(ProductEntity);
    const secondProduct = await productRepo.save(
      productRepo.create({
        sku: 'INT-BOOK-01',
        slug: 'int-book-01',
        name: 'Integration Guide',
        description: 'Technical book',
        price: 28.5,
        currency: 'USD',
        categoryId: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const order = Order.create({
      id: null,
      userId: seededData.customerUser.id,
      paymentMethod: PaymentMethodType.STRIPE,
      shippingAddress: OrderTestFactory.createShippingAddressProps({
        id: null,
      }),
      customerNotes: null,
      items: [
        {
          id: null,
          productId: seededData.product.id,
          productName: seededData.product.name,
          sku: seededData.product.sku,
          unitPrice: seededData.product.price,
          quantity: 1,
        },
        {
          id: null,
          productId: secondProduct.id,
          productName: secondProduct.name,
          sku: secondProduct.sku,
          unitPrice: secondProduct.price,
          quantity: 1,
        },
      ],
    });

    const saveResult = await repository.save(order);
    ResultAssertionHelper.assertResultSuccess(saveResult);

    const loaded = await repository.findById(saveResult.value.id!);
    ResultAssertionHelper.assertResultSuccess(loaded);
    expect(loaded.value.getItems()).toHaveLength(2);
    expect(loaded.value.totalPrice).toBeCloseTo(
      seededData.product.price + secondProduct.price,
      2,
    );
    expect(
      loaded.value.getItems().every((item) => item.id != null && item.id > 0),
    ).toBe(true);
  });

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
