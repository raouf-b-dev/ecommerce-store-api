import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import {
  SYSTEM_CALLER_CONTEXT,
  createUserCallerContext,
} from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { ResultAssertionHelper } from '../../../../../testing';
import { OrderStatus } from '../../domain/value-objects/order-status';
import { OrderTestFactory } from 'src/modules/orders/testing';
import { CancelOrderAccessPolicy } from './cancel-order-access.policy';

describe('CancelOrderAccessPolicy', () => {
  const orderId = 1;
  const ownerContext = createUserCallerContext({
    userId: 2,
    role: 'CUSTOMER',
    permissions: new Set(['cancel_own_orders']),
  });
  const otherCustomerContext = createUserCallerContext({
    userId: 3,
    role: 'CUSTOMER',
    permissions: new Set(['cancel_own_orders']),
  });
  const manageOrdersContext = createUserCallerContext({
    userId: 9,
    role: 'ADMIN',
    permissions: new Set(['manage_orders']),
  });

  it.each([
    OrderStatus.PENDING_PAYMENT,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.CONFIRMED,
  ])('allows the owner to cancel a %s order', (status) => {
    const order = OrderTestFactory.createDomainOrder({
      id: orderId,
      userId: 2,
      status,
      paymentId: status === OrderStatus.PENDING_PAYMENT ? null : 1,
    });

    const result = CancelOrderAccessPolicy.authorize(
      ownerContext,
      order,
      orderId,
    );

    ResultAssertionHelper.assertResultSuccess(result);
  });

  it('returns 409 when the owner cancels a PROCESSING order', () => {
    const order = OrderTestFactory.createDomainOrder({
      id: orderId,
      userId: 2,
      status: OrderStatus.PROCESSING,
      paymentId: 1,
    });

    const result = CancelOrderAccessPolicy.authorize(
      ownerContext,
      order,
      orderId,
    );

    ResultAssertionHelper.assertResultFailure(
      result,
      'Order cannot be cancelled in current state',
      DomainError,
    );
    expect(result).toMatchObject({
      isFailure: true,
      error: { statusCode: 409 },
    });
  });

  it('allows manage_orders to cancel a PROCESSING order', () => {
    const order = OrderTestFactory.createDomainOrder({
      id: orderId,
      userId: 2,
      status: OrderStatus.PROCESSING,
      paymentId: 1,
    });

    const result = CancelOrderAccessPolicy.authorize(
      manageOrdersContext,
      order,
      orderId,
    );

    ResultAssertionHelper.assertResultSuccess(result);
  });

  it('allows the system caller to cancel a PROCESSING order', () => {
    const order = OrderTestFactory.createDomainOrder({
      id: orderId,
      userId: 2,
      status: OrderStatus.PROCESSING,
      paymentId: 1,
    });

    const result = CancelOrderAccessPolicy.authorize(
      SYSTEM_CALLER_CONTEXT,
      order,
      orderId,
    );

    ResultAssertionHelper.assertResultSuccess(result);
  });

  it('returns not found for a foreign order', () => {
    const order = OrderTestFactory.createDomainOrder({
      id: orderId,
      userId: 2,
      status: OrderStatus.PENDING_PAYMENT,
      paymentId: null,
    });

    const result = CancelOrderAccessPolicy.authorize(
      otherCustomerContext,
      order,
      orderId,
    );

    ResultAssertionHelper.assertResultFailure(
      result,
      `Order with id ${orderId} not found`,
      UseCaseError,
    );
  });
});
