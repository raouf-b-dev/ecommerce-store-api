import { Queue } from 'bullmq';
import {
  SIMULATED_WEBHOOK_DELAY_MS,
  FakeStripePaymentProvider,
} from './fake-stripe-payment.provider';
import { STRIPE_PAYMENT_PROVIDER_ID } from './stripe-provider-id';
import { JobNames } from '../../../../infrastructure/jobs/job-names';
import { JobConfigService } from '../../../../infrastructure/jobs/job-config.service';
import {
  MockEnvConfigService,
  createMockQueue,
  ResultAssertionHelper,
} from '../../../../testing';
import { Money } from '../../../../shared-kernel/domain/value-objects/money';

describe('FakeStripePaymentProvider', () => {
  let provider: FakeStripePaymentProvider;
  let mockQueue: jest.Mocked<Queue>;
  let mockConfigService: MockEnvConfigService;
  let jobConfigService: JobConfigService;

  beforeEach(() => {
    mockQueue = createMockQueue('payments');
    mockConfigService = new MockEnvConfigService();
    jobConfigService = new JobConfigService();
    provider = new FakeStripePaymentProvider(
      mockQueue,
      mockConfigService,
      jobConfigService,
    );
  });

  it('exposes the Stripe PaymentProviderId', () => {
    expect(provider.id.equals(STRIPE_PAYMENT_PROVIDER_ID)).toBe(true);
    expect(provider.id.value).toBe('stripe');
  });

  describe('initiatePayment', () => {
    it('initiates payment with providerReference derived from idempotencyKey and enqueues delayed webhook via jobConfigService', async () => {
      mockConfigService.setMockConfig({
        payments: { mockAutoComplete: true, stripeWebhookSecret: '' },
      });

      const money = Money.create(100, 'USD');
      ResultAssertionHelper.assertResultSuccess(money);

      const result = await provider.initiatePayment({
        amount: money.value,
        idempotencyKey: 'payment-intent-101',
        metadata: {
          orderId: '1',
          cartId: '2',
        },
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.providerReference).toBe('pi_payment-intent-101');
      expect(result.value.nextAction.type).toBe('confirm_on_client');
      expect(result.value.nextAction.clientSecret).toBe(
        'pi_payment-intent-101_secret_payment-intent-101',
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        JobNames.SIMULATE_MOCK_PAYMENT_WEBHOOK,
        {
          paymentIntentId: 'pi_payment-intent-101',
          transactionId: 'pi_payment-intent-101',
          metadata: { orderId: '1', cartId: '2' },
          amountMinor: 100,
          currency: 'USD',
        },
        {
          ...jobConfigService.getJobOptions(
            JobNames.SIMULATE_MOCK_PAYMENT_WEBHOOK,
            'payment-intent-101',
          ),
          delay: SIMULATED_WEBHOOK_DELAY_MS,
        },
      );
    });

    it('does not enqueue webhook when mockAutoComplete is disabled', async () => {
      mockConfigService.setMockConfig({
        payments: { mockAutoComplete: false, stripeWebhookSecret: '' },
      });

      const money = Money.create(100, 'USD');
      ResultAssertionHelper.assertResultSuccess(money);

      const result = await provider.initiatePayment({
        amount: money.value,
        idempotencyKey: 'payment-intent-101',
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('returns failure when mock webhook enqueueing fails', async () => {
      mockConfigService.setMockConfig({
        payments: { mockAutoComplete: true, stripeWebhookSecret: '' },
      });

      mockQueue.add.mockRejectedValueOnce(new Error('Redis connection lost'));

      const money = Money.create(100, 'USD');
      ResultAssertionHelper.assertResultSuccess(money);

      const result = await provider.initiatePayment({
        amount: money.value,
        idempotencyKey: 'payment-intent-101',
      });

      ResultAssertionHelper.assertResultFailure(result);
      expect(result.error.message).toContain('Redis connection lost');
    });
  });

  describe('authorize', () => {
    it('returns authorized outcome with provider reference', async () => {
      const result = await provider.authorize();

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toMatchObject({
        outcome: 'authorized',
        providerReference: expect.stringMatching(/^pi_auth_/),
      });
    });
  });

  describe('capture', () => {
    it('returns provider reference', async () => {
      const money = Money.create(100, 'USD');
      ResultAssertionHelper.assertResultSuccess(money);

      const result = await provider.capture('pi_123', money.value);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.providerReference).toBe('pi_123');
    });
  });

  describe('refund', () => {
    it('returns provider reference', async () => {
      const money = Money.create(50, 'USD');
      ResultAssertionHelper.assertResultSuccess(money);

      const result = await provider.refund({
        providerReference: 'pi_123',
        amount: money.value,
        idempotencyKey: 'refund-1-0',
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.providerReference).toBe('pi_123');
    });
  });
});
