import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { SeededData } from 'test/integration/harness/seed-reference-data';
import { OrderEntityTestFactory } from 'src/modules/orders/testing';
import { PaymentEntityTestFactory } from 'src/modules/payments/testing';
import { OrderEntity } from 'src/modules/orders/secondary-adapters/orm/order.schema';
import { OrderItemEntity } from 'src/modules/orders/secondary-adapters/orm/order-item.schema';
import { ShippingAddressEntity } from 'src/modules/orders/secondary-adapters/orm/shipping-address.schema';
import { PaymentEntity } from 'src/modules/payments/secondary-adapters/orm/payment.schema';
import { InventoryEntity } from 'src/modules/inventory/secondary-adapters/orm/inventory.schema';
import { OrderStatus } from 'src/modules/orders/core/domain/value-objects/order-status';
import { PaymentStatusType } from 'src/modules/payments/core/domain/value-objects/payment-status';
import { PostgresAnalyticsQueryAdapter } from './postgres-analytics-query.adapter';

describe('PostgresAnalyticsQueryAdapter (Integration - Real DB)', () => {
  let queryAdapter: PostgresAnalyticsQueryAdapter;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();
    queryAdapter = new PostgresAnalyticsQueryAdapter(
      IntegrationTestHelper.getDataSource(),
    );
  });

  const createOrder = async (overrides: {
    status?: OrderStatus;
    createdAt?: Date;
    items?: Array<{
      productId: number;
      productName: string;
      sku: string;
      quantity: number;
      lineTotal: number;
      unitPrice: number;
    }>;
  }): Promise<OrderEntity> => {
    const shippingAddressRepo = IntegrationTestHelper.getRepository(
      ShippingAddressEntity,
    );
    const orderRepo = IntegrationTestHelper.getRepository(OrderEntity);
    const itemRepo = IntegrationTestHelper.getRepository(OrderItemEntity);

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
          status: overrides.status ?? OrderStatus.CONFIRMED,
          createdAt:
            overrides.createdAt ?? new Date('2026-08-10T12:00:00.000Z'),
          updatedAt:
            overrides.createdAt ?? new Date('2026-08-10T12:00:00.000Z'),
        }),
      ),
    );

    const items =
      overrides.items ??
      ([
        {
          productId: seededData.product.id,
          productName: seededData.product.name,
          sku: seededData.product.sku ?? 'INT-LAPTOP-01',
          quantity: 2,
          unitPrice: 50,
          lineTotal: 100,
        },
      ] as const);

    for (const item of items) {
      await itemRepo.save(
        itemRepo.create(
          OrderEntityTestFactory.createUnsavedOrderItemEntity({
            ...item,
            order: order,
          }),
        ),
      );
    }

    return order;
  };

  const createPayment = async (
    overrides: Partial<PaymentEntity> = {},
  ): Promise<PaymentEntity> => {
    const paymentRepo = IntegrationTestHelper.getRepository(PaymentEntity);
    return paymentRepo.save(
      paymentRepo.create(
        PaymentEntityTestFactory.createUnsavedPaymentEntity({
          orderId: 1,
          userId: seededData.customerUser.id,
          amount: 100,
          currency: 'USD',
          status: PaymentStatusType.CAPTURED,
          refundedAmount: 0,
          completedAt: new Date('2026-08-10T15:00:00.000Z'),
          createdAt: new Date('2026-08-10T15:00:00.000Z'),
          updatedAt: new Date('2026-08-10T15:00:00.000Z'),
          ...overrides,
        }),
      ),
    );
  };

  it('computes revenue KPIs and previous window from CAPTURED payments', async () => {
    await createPayment({
      amount: 100,
      refundedAmount: 20,
      completedAt: new Date('2026-08-10T12:00:00.000Z'),
    });
    await createPayment({
      amount: 50,
      refundedAmount: 0,
      status: PaymentStatusType.COMPLETED,
      completedAt: new Date('2026-08-11T12:00:00.000Z'),
    });
    // Outside current window — previous period
    await createPayment({
      amount: 40,
      refundedAmount: 0,
      completedAt: new Date('2026-08-03T12:00:00.000Z'),
    });
    await createOrder({
      status: OrderStatus.PENDING_PAYMENT,
      createdAt: new Date('2026-08-10T10:00:00.000Z'),
    });

    const from = new Date('2026-08-08T00:00:00.000Z');
    const to = new Date('2026-08-14T23:59:59.999Z');
    const durationMs = to.getTime() - from.getTime();
    const result = await queryAdapter.getOverview({
      from,
      to,
      previousFrom: new Date(from.getTime() - durationMs),
      previousTo: from,
    });

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value.timezone).toBe('UTC');
    expect(result.value.current.grossRevenue).toBe(150);
    expect(result.value.current.refundedAmount).toBe(20);
    expect(result.value.current.netRevenue).toBe(130);
    expect(result.value.current.paidOrderCount).toBe(2);
    expect(result.value.current.aov).toBe(65);
    expect(result.value.current.ordersCount).toBe(1);
    expect(result.value.previous.grossRevenue).toBe(40);
    expect(
      result.value.ordersNeedingAttention.some(
        (row) => row.status === 'pending_payment' && row.count === 1,
      ),
    ).toBe(true);
  });

  it('includes PARTIALLY_REFUNDED payments in revenue KPIs', async () => {
    await createPayment({
      amount: 100,
      refundedAmount: 25,
      status: PaymentStatusType.PARTIALLY_REFUNDED,
      completedAt: new Date('2026-08-10T12:00:00.000Z'),
    });

    const from = new Date('2026-08-08T00:00:00.000Z');
    const to = new Date('2026-08-14T23:59:59.999Z');
    const durationMs = to.getTime() - from.getTime();
    const result = await queryAdapter.getOverview({
      from,
      to,
      previousFrom: new Date(from.getTime() - durationMs),
      previousTo: from,
    });

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value.current.grossRevenue).toBe(100);
    expect(result.value.current.refundedAmount).toBe(25);
    expect(result.value.current.netRevenue).toBe(75);
    expect(result.value.current.paidOrderCount).toBe(1);
  });

  it('zero-fills missing day buckets in payments time series', async () => {
    await createPayment({
      amount: 25,
      completedAt: new Date('2026-08-02T12:00:00.000Z'),
    });

    const result = await queryAdapter.getPaymentsTimeSeries({
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-08-03T23:59:59.999Z'),
      bucket: 'day',
    });

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value.buckets).toHaveLength(3);
    expect(result.value.buckets[0]).toMatchObject({
      bucketStart: '2026-08-01T00:00:00.000Z',
      netAmount: 0,
      capturedCount: 0,
    });
    expect(result.value.buckets[1]).toMatchObject({
      bucketStart: '2026-08-02T00:00:00.000Z',
      grossAmount: 25,
      netAmount: 25,
      capturedCount: 1,
    });
    expect(result.value.buckets[2].netAmount).toBe(0);
  });

  it('returns top products for paid fulfillment statuses', async () => {
    await createOrder({
      status: OrderStatus.CONFIRMED,
      createdAt: new Date('2026-08-10T12:00:00.000Z'),
      items: [
        {
          productId: seededData.product.id,
          productName: seededData.product.name,
          sku: 'INT-LAPTOP-01',
          quantity: 3,
          unitPrice: 10,
          lineTotal: 30,
        },
      ],
    });

    const result = await queryAdapter.getTopProducts({
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-08-31T23:59:59.999Z'),
      limit: 5,
    });

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0].productId).toBe(seededData.product.id);
    expect(result.value.items[0].unitsSold).toBe(3);
    expect(result.value.items[0].lineRevenue).toBe(30);
  });

  it('lists inventory alerts when available is at or below threshold', async () => {
    const inventoryRepo = IntegrationTestHelper.getRepository(InventoryEntity);
    await inventoryRepo.update(
      { productId: seededData.product.id },
      { availableQuantity: 2, lowStockThreshold: 10 },
    );

    const result = await queryAdapter.getInventoryAlerts({ limit: 20 });

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0].productId).toBe(seededData.product.id);
    expect(result.value.items[0].availableQuantity).toBe(2);
    expect(result.value.items[0].lowStockThreshold).toBe(10);
  });
});
