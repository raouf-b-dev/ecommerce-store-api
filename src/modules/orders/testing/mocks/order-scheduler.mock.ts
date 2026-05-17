import {
  OrderScheduler,
  ScheduleCheckoutProps,
} from '../../core/domain/schedulers/order.scheduler';
import { Result } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';

export class MockOrderScheduler implements OrderScheduler {
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

  schedulePostConfirmation = jest.fn<
    Promise<Result<string, InfrastructureError>>,
    [number]
  >();

  scheduleOrderStockRelease = jest.fn<
    Promise<Result<string, InfrastructureError>>,
    [number]
  >();
}
