import { Queue } from 'bullmq';
import {
  SIMULATED_WEBHOOK_DELAY_MS,
  FakeStripeGateway,
} from './fake-stripe.gateway';
import { JobNames } from '../../../../infrastructure/jobs/job-names';
import { JobConfigService } from '../../../../infrastructure/jobs/job-config.service';
import {
  MockEnvConfigService,
  createMockQueue,
  ResultAssertionHelper,
} from '../../../../testing';
import { PaymentStatusType } from '../../core/domain/value-objects/payment-status';
import { Money } from '../../../../shared-kernel/domain/value-objects/money';

describe('FakeStripeGateway', () => {
  let gateway: FakeStripeGateway;
  let mockQueue: jest.Mocked<Queue>;
  let mockConfigService: MockEnvConfigService;
  let jobConfigService: JobConfigService;

  beforeEach(() => {
    mockQueue = createMockQueue('payments');
    mockConfigService = new MockEnvConfigService();
    jobConfigService = new JobConfigService();
    gateway = new FakeStripeGateway(
      mockQueue,
      mockConfigService,
      jobConfigService,
    );
  });

  describe('initiatePayment', () => {
    it('initiates payment and enqueues delayed webhook when mockAutoComplete is enabled', async () => {
      mockConfigService.setMockConfig({
        payments: { mockAutoComplete: true, stripeWebhookSecret: '' },
      });

      const money = Money.create(100, 'USD');
      ResultAssertionHelper.assertResultSuccess(money);

      const result = await gateway.initiatePayment({
        amount: money.value,
        metadata: {
          orderId: '1',
          cartId: '2',
        },
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.providerReference).toMatch(/^pi_[a-f0-9]+$/);
      expect(result.value.status).toBe(PaymentStatusType.PENDING);
      expect(result.value.nextAction.type).toBe('confirm_on_client');
      expect(result.value.nextAction.clientSecret).toContain(
        result.value.providerReference,
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        JobNames.SIMULATE_MOCK_PAYMENT_WEBHOOK,
        {
          paymentIntentId: result.value.providerReference,
          transactionId: result.value.providerReference,
          metadata: { orderId: '1', cartId: '2' },
          amountMinor: 100,
          currency: 'USD',
        },
        {
          ...jobConfigService.getJobOptions(
            JobNames.SIMULATE_MOCK_PAYMENT_WEBHOOK,
            result.value.providerReference,
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

      const result = await gateway.initiatePayment({
        amount: money.value,
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

      const result = await gateway.initiatePayment({
        amount: money.value,
      });

      ResultAssertionHelper.assertResultFailure(result);
      expect(result.error.message).toContain('Redis connection lost');
    });
  });

  describe('authorize', () => {
    it('returns authorized status with provider reference', async () => {
      const money = Money.create(100, 'USD');
      ResultAssertionHelper.assertResultSuccess(money);

      const result = await gateway.authorize(money.value, 'card_details');

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(PaymentStatusType.AUTHORIZED);
      expect(result.value.providerReference).toMatch(/^stripe_pi_/);
    });
  });

  describe('capture', () => {
    it('returns captured status with provider reference', async () => {
      const money = Money.create(100, 'USD');
      ResultAssertionHelper.assertResultSuccess(money);

      const result = await gateway.capture('pi_123', money.value);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(PaymentStatusType.CAPTURED);
      expect(result.value.providerReference).toBe('pi_123');
    });
  });

  describe('refund', () => {
    it('returns refunded status with provider reference', async () => {
      const money = Money.create(50, 'USD');
      ResultAssertionHelper.assertResultSuccess(money);

      const result = await gateway.refund({
        providerReference: 'pi_123',
        amount: money.value,
        idempotencyKey: 'refund-1-0',
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.status).toBe(PaymentStatusType.REFUNDED);
      expect(result.value.providerReference).toBe('pi_123');
    });

    it('returns failure when refund amount is zero or negative', async () => {
      const money = Money.create(0, 'USD');
      ResultAssertionHelper.assertResultSuccess(money);

      const result = await gateway.refund({
        providerReference: 'pi_123',
        amount: money.value,
        idempotencyKey: 'refund-1-0',
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Refund amount must be greater than zero',
      );
    });
  });
});
