import { Result } from '../../shared-kernel/domain/result';
import { OrderScheduler } from '../../modules/orders/core/domain/schedulers/order.scheduler';

export class MockOrderScheduler extends OrderScheduler {
  scheduleCheckout = jest.fn();
  schedulePostPayment = jest.fn();
  scheduleStockRelease = jest.fn();
  schedulePostConfirmation = jest
    .fn()
    .mockResolvedValue(Result.success('flow-id'));
  scheduleOrderStockRelease = jest.fn();
}
