import {
  HandlePaymentWebhookService,
  PaymentWebhookDto,
  PaymentWebhookResult,
} from '../../core/application/services/handle-payment-webhook/handle-payment-webhook.service';
import { MockPaymentRepository } from './payment-repository.mock';
import { MockPaymentEventsScheduler } from './payment-events-scheduler.mock';
import { Result } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';

export class MockHandlePaymentWebhookService extends HandlePaymentWebhookService {
  constructor() {
    super(new MockPaymentRepository(), new MockPaymentEventsScheduler());
    this.execute = jest.fn();
  }

  override execute: jest.Mock<
    Promise<Result<PaymentWebhookResult, AppError>>,
    [PaymentWebhookDto]
  >;

  reset(): void {
    jest.clearAllMocks();
  }
}
