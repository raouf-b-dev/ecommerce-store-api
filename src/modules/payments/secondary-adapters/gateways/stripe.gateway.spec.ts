import { Queue } from 'bullmq';
import { StripeGateway } from './stripe.gateway';
import { JobNames } from '../../../../infrastructure/jobs/job-names';
import { MockEnvConfigService, createMockQueue } from '../../../../testing';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';
import { isSuccess } from '../../../../shared-kernel/domain/result';

describe('StripeGateway', () => {
  let gateway: StripeGateway;
  let mockQueue: jest.Mocked<Queue>;
  let mockConfigService: MockEnvConfigService;

  beforeEach(() => {
    mockQueue = createMockQueue('payments');
    mockConfigService = new MockEnvConfigService();
    gateway = new StripeGateway(mockQueue, mockConfigService);
  });

  it('returns STRIPE payment method type', () => {
    expect(gateway.getMethod()).toBe(PaymentMethodType.STRIPE);
  });

  it('creates payment intent and enqueues delayed webhook when mockAutoComplete is enabled', async () => {
    mockConfigService.setMockConfig({
      payments: { mockAutoComplete: true },
    });

    const result = await gateway.createPaymentIntent(100, 'USD', {
      orderId: '1',
      cartId: '2',
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.paymentIntentId).toMatch(/^pi_[a-f0-9]+$/);
      expect(result.value.clientSecret).toContain(result.value.paymentIntentId);

      expect(mockQueue.add).toHaveBeenCalledWith(
        JobNames.SIMULATE_MOCK_PAYMENT_WEBHOOK,
        {
          paymentIntentId: result.value.paymentIntentId,
          transactionId: result.value.paymentIntentId,
          metadata: { orderId: '1', cartId: '2' },
          amount: 100,
          currency: 'USD',
        },
        { delay: 1000 },
      );
    }
  });

  it('does not enqueue webhook when mockAutoComplete is disabled', async () => {
    mockConfigService.setMockConfig({
      payments: { mockAutoComplete: false },
    });

    const result = await gateway.createPaymentIntent(100, 'USD');

    expect(isSuccess(result)).toBe(true);
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it('returns failure when mock webhook enqueueing fails', async () => {
    mockConfigService.setMockConfig({
      payments: { mockAutoComplete: true },
    });

    mockQueue.add.mockRejectedValueOnce(new Error('Redis connection lost'));

    const result = await gateway.createPaymentIntent(100, 'USD');

    expect(isSuccess(result)).toBe(false);
    if (!isSuccess(result)) {
      expect(result.error.message).toContain('Redis connection lost');
    }
  });
});
