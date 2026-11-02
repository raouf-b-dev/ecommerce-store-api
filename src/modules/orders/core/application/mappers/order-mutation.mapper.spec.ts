import { OrderStatus } from '../../domain/value-objects/order-status';
import { OrderTestFactory } from '../../../testing';
import { OrderMutationMapper } from './order-mutation.mapper';

describe('OrderMutationMapper', () => {
  it('maps domain totalPrice to totalAmount without other order fields', () => {
    const order = OrderTestFactory.createDomainOrder({
      status: OrderStatus.CONFIRMED,
    });

    const result = OrderMutationMapper.fromDomain(order);

    expect(result).toEqual({
      id: order.id,
      status: order.status,
      totalAmount: order.totalPrice,
      currency: order.currency,
      updatedAt: order.updatedAt.toISOString(),
    });
    expect(result).not.toHaveProperty('paymentId');
    expect(result).not.toHaveProperty('totalPrice');
    expect(result).not.toHaveProperty('items');
  });

  it('throws when the order has no id', () => {
    const order = OrderTestFactory.createDomainOrder({ id: null });

    expect(() => OrderMutationMapper.fromDomain(order)).toThrow(
      /persisted order id/,
    );
  });
});
