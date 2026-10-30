import { HttpStatus } from '@nestjs/common';
import { ScheduleOrderRefundService } from './schedule-order-refund.service';
import {
  MockOrderScheduler,
  OrderTestFactory,
} from 'src/modules/orders/testing';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ResultAssertionHelper } from '../../../../../testing';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { OrderStatus } from '../../domain/value-objects/order-status';

describe('ScheduleOrderRefundService', () => {
  let service: ScheduleOrderRefundService;
  let mockOrderScheduler: MockOrderScheduler;

  beforeEach(() => {
    mockOrderScheduler = new MockOrderScheduler();
    mockOrderScheduler.scheduleRefundPayment.mockResolvedValue(
      Result.success('refund-job-id'),
    );
    service = new ScheduleOrderRefundService(mockOrderScheduler);
  });

  it('returns success and schedules nothing when paymentId is null', async () => {
    const order = OrderTestFactory.createDomainOrder({
      status: OrderStatus.CANCELLED,
      paymentId: null,
    });

    const result = await service.scheduleIfPaid(order, 1, 'Order cancelled');

    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockOrderScheduler.scheduleRefundPayment).not.toHaveBeenCalled();
  });

  it('returns failure when paymentId is set and total is zero', async () => {
    const order = OrderTestFactory.createDomainOrder({
      status: OrderStatus.CONFIRMED,
      paymentId: 42,
      items: [
        {
          id: 1,
          productId: 1,
          productName: 'Free item',
          quantity: 1,
          unitPrice: 0,
          currency: 'USD',
        },
      ],
    });

    const result = await service.scheduleIfPaid(order, 1, 'Order cancelled');

    ResultAssertionHelper.assertResultFailure(
      result,
      'Refund amount must be greater than zero',
      UseCaseError,
    );
    expect(mockOrderScheduler.scheduleRefundPayment).not.toHaveBeenCalled();
  });

  it('schedules one refund when paymentId is set and total is positive', async () => {
    const orderId = 7;
    const paymentId = 42;
    const reason = 'Order cancelled';
    const order = OrderTestFactory.createDomainOrder({
      id: orderId,
      status: OrderStatus.CONFIRMED,
      paymentId,
    });

    const result = await service.scheduleIfPaid(order, orderId, reason);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledTimes(1);
    expect(mockOrderScheduler.scheduleRefundPayment).toHaveBeenCalledWith({
      orderId,
      paymentId,
      amount: order.getPricing().getTotalPriceMoney().toMajorUnits(),
      reason,
    });
  });

  it('returns a retryable 500 UseCaseError when the scheduler fails retryably', async () => {
    const order = OrderTestFactory.createDomainOrder({
      status: OrderStatus.CONFIRMED,
      paymentId: 42,
    });
    const cause = new InfrastructureError('Queue down', { retryable: true });
    mockOrderScheduler.scheduleRefundPayment.mockResolvedValue(
      Result.failure(cause),
    );

    const result = await service.scheduleIfPaid(order, 1, 'Order cancelled');

    ResultAssertionHelper.assertResultFailure(
      result,
      'Order cancelled but the refund could not be scheduled',
      UseCaseError,
      cause,
    );
    expect(result).toMatchObject({
      isFailure: true,
      error: { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, retryable: true },
    });
  });

  it('returns a non-retryable 500 UseCaseError when the scheduler fails non-retryably', async () => {
    const order = OrderTestFactory.createDomainOrder({
      status: OrderStatus.CONFIRMED,
      paymentId: 42,
    });
    const cause = new InfrastructureError('Invalid payload', {
      retryable: false,
    });
    mockOrderScheduler.scheduleRefundPayment.mockResolvedValue(
      Result.failure(cause),
    );

    const result = await service.scheduleIfPaid(order, 1, 'Order cancelled');

    ResultAssertionHelper.assertResultFailure(
      result,
      'Order cancelled but the refund could not be scheduled',
      UseCaseError,
      cause,
    );
    expect(result).toMatchObject({
      isFailure: true,
      error: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        retryable: false,
      },
    });
  });
});
