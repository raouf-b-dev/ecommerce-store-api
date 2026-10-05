import {
  OrderScheduler,
  ScheduleCheckoutProps,
  ScheduleRefundPaymentProps,
} from '../../core/domain/schedulers/order.scheduler';
import { Result } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';

export class FakeRefundScheduler implements OrderScheduler {
  readonly jobs = new Map<string, ScheduleRefundPaymentProps>();
  private readonly failures: InfrastructureError[] = [];

  failNext(error: InfrastructureError): void {
    this.failures.push(error);
  }

  scheduleRefundPayment = jest.fn<
    Promise<Result<string, InfrastructureError>>,
    [ScheduleRefundPaymentProps]
  >((props: ScheduleRefundPaymentProps) => {
    const failure = this.failures.shift();
    if (failure) {
      return Promise.resolve(Result.failure(failure));
    }
    const jobId = `refund-payment-order-${props.orderId}`;
    if (!this.jobs.has(jobId)) {
      this.jobs.set(jobId, props);
    }
    return Promise.resolve(Result.success(jobId));
  });

  scheduleOrderStockRelease = jest.fn<
    Promise<Result<string, InfrastructureError>>,
    [number]
  >(() => Promise.resolve(Result.success('stock-release-job')));

  scheduleCheckout = jest.fn<
    Promise<Result<string, InfrastructureError>>,
    [ScheduleCheckoutProps]
  >(() => Promise.resolve(Result.success('checkout-job')));

  schedulePostPayment = jest.fn<
    Promise<Result<string, InfrastructureError>>,
    [number, number, number]
  >(() => Promise.resolve(Result.success('post-payment-job')));

  scheduleStockRelease = jest.fn<
    Promise<Result<string, InfrastructureError>>,
    [number]
  >(() => Promise.resolve(Result.success('stock-release-job')));

  schedulePendingOrdersExpiration = jest.fn<
    Promise<Result<string, InfrastructureError>>,
    []
  >(() => Promise.resolve(Result.success('pending-orders-job')));

  reset(): void {
    this.jobs.clear();
    this.failures.length = 0;
    this.scheduleRefundPayment.mockClear();
    this.scheduleOrderStockRelease.mockClear();
    this.scheduleCheckout.mockClear();
    this.schedulePostPayment.mockClear();
    this.scheduleStockRelease.mockClear();
    this.schedulePendingOrdersExpiration.mockClear();
  }
}
