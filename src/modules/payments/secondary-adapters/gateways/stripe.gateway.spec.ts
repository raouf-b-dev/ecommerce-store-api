import { Queue } from 'bullmq';
import { StripeGateway } from './stripe.gateway';
import { JobNames } from '../../../../infrastructure/jobs/job-names';
import { JobConfigService } from '../../../../infrastructure/jobs/job-config.service';
import {
  MockEnvConfigService,
  createMockQueue,
  ResultAssertionHelper,
} from '../../../../testing';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';

describe('StripeGateway', () => {
  let gateway: StripeGateway;
  let mockQueue: jest.Mocked<Queue>;
  let mockConfigService: MockEnvConfigService;
  let jobConfigService: JobConfigService;

  beforeEach(() => {
    mockQueue = createMockQueue('payments');
    mockConfigService = new MockEnvConfigService();
    jobConfigService = new JobConfigService();
    gateway = new StripeGateway(mockQueue, mockConfigService, jobConfigService);
  });

  it('returns STRIPE payment method type', () => {
    expect(gateway.getMethod()).toBe(PaymentMethodType.STRIPE);
  });

  it('creates payment intent and enqueues delayed webhook when mockAutoComplete is enabled', async () => {
    mockConfigService.setMockConfig({
      payments: { mockAutoComplete: true, stripeWebhookSecret: '' },
    });

    const result = await gateway.createPaymentIntent(100, 'USD', {
      orderId: '1',
      cartId: '2',
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.paymentIntentId).toMatch(/^pi_[a-f0-9]+$/);
    expect(result.value.clientSecret).toContain(result.value.paymentIntentId);

    expect(mockQueue.add).toHaveBeenCalledWith(
      JobNames.SIMULATE_MOCK_PAYMENT_WEBHOOK,
      {
        paymentIntentId: result.value.paymentIntentId,
        transactionId: result.value.paymentIntentId,
        metadata: { orderId: '1', cartId: '2' },
        amountMinor: 100,
        currency: 'USD',
      },
      {
        ...jobConfigService.getJobOptions(
          JobNames.SIMULATE_MOCK_PAYMENT_WEBHOOK,
          result.value.paymentIntentId,
        ),
        delay: 1000,
      },
    );
  });

  it('does not enqueue webhook when mockAutoComplete is disabled', async () => {
    mockConfigService.setMockConfig({
      payments: { mockAutoComplete: false, stripeWebhookSecret: '' },
    });

    const result = await gateway.createPaymentIntent(100, 'USD');

    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it('returns failure when mock webhook enqueueing fails', async () => {
    mockConfigService.setMockConfig({
      payments: { mockAutoComplete: true, stripeWebhookSecret: '' },
    });

    mockQueue.add.mockRejectedValueOnce(new Error('Redis connection lost'));

    const result = await gateway.createPaymentIntent(100, 'USD');

    ResultAssertionHelper.assertResultFailure(result);
    expect(result.error.message).toContain('Redis connection lost');
  });
});
