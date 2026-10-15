import {
  OrderScheduler,
  ScheduleCheckoutProps,
  ScheduleRefundPaymentProps,
} from '../../core/domain/schedulers/order.scheduler';
import { Result } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { JobConfigService } from '../../../../infrastructure/jobs/job-config.service';
import { JobNames } from '../../../../infrastructure/jobs/job-names';

export class MockOrderScheduler implements OrderScheduler {
  readonly jobs = new Map<string, ScheduleRefundPaymentProps>();
  private readonly refundFailures: InfrastructureError[] = [];
  private readonly jobConfig: JobConfigService;

  constructor(jobConfig: JobConfigService = new JobConfigService()) {
    this.jobConfig = jobConfig;
  }

  failNext(error: InfrastructureError): void {
    this.refundFailures.push(error);
  }

  scheduleCheckout = jest.fn<
    Promise<Result<string, InfrastructureError>>,
    [ScheduleCheckoutProps]
  >();

  schedulePostPayment = jest.fn<
    Promise<Result<string, InfrastructureError>>,
    [number, number, number]
  >();

  scheduleStockRelease = jest.fn<
    Promise<Result<string, InfrastructureError>>,
    [number]
  >();

  schedulePostConfirmation = jest
    .fn<Promise<Result<string, InfrastructureError>>, [number]>()
    .mockResolvedValue(Result.success('flow-id'));

  scheduleOrderStockRelease = jest.fn<
    Promise<Result<string, InfrastructureError>>,
    [number]
  >();

  scheduleRefundPayment = jest.fn<
    Promise<Result<string, InfrastructureError>>,
    [ScheduleRefundPaymentProps]
  >((props: ScheduleRefundPaymentProps) => {
    const failure = this.refundFailures.shift();
    if (failure) {
      return Promise.resolve(Result.failure(failure));
    }
    const jobId = this.jobConfig.getJobId(
      JobNames.REFUND_PAYMENT,
      `order-${props.orderId}`,
    );
    if (!this.jobs.has(jobId)) {
      this.jobs.set(jobId, props);
    }
    return Promise.resolve(Result.success(jobId));
  });

  schedulePendingOrdersExpiration = jest.fn<
    Promise<Result<string, InfrastructureError>>,
    []
  >();
}
