import { Queue } from 'bullmq';
import { BullMqPaymentEventsScheduler } from './bullmq-payment-events.scheduler';
import { JobNames } from '../../../../infrastructure/jobs/job-names';
import { JobConfigService } from '../../../../infrastructure/jobs/job-config.service';
import {
  MockCorrelationService,
  createMockQueue,
  ResultAssertionHelper,
} from '../../../../testing';
import { PaymentDtoTestFactory } from '../../testing';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { isFailure } from '../../../../shared-kernel/domain/result';

describe('BullMqPaymentEventsScheduler', () => {
  let scheduler: BullMqPaymentEventsScheduler;
  let mockQueue: jest.Mocked<Queue>;
  let mockCorrelation: MockCorrelationService;
  let jobConfigService: JobConfigService;

  beforeEach(() => {
    mockQueue = createMockQueue('payment-events');
    mockCorrelation = new MockCorrelationService();
    mockCorrelation.getId.mockReturnValue('test-correlation-id');
    jobConfigService = new JobConfigService();

    scheduler = new BullMqPaymentEventsScheduler(
      mockQueue,
      mockCorrelation,
      jobConfigService,
    );
  });

  describe('emitPaymentCompleted', () => {
    it('calls queue.add with retry policy options (attempts: 5)', async () => {
      const props = PaymentDtoTestFactory.createPaymentCompletedProps();

      const result = await scheduler.emitPaymentCompleted(props);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockQueue.add).toHaveBeenCalledWith(
        JobNames.PAYMENT_COMPLETED,
        {
          ...props,
          correlationId: 'test-correlation-id',
        },
        expect.objectContaining({
          attempts: 5,
        }),
      );
    });

    it('returns an InfrastructureError when queue.add rejects', async () => {
      mockQueue.add.mockRejectedValue(new Error('Redis connection lost'));

      const props = PaymentDtoTestFactory.createPaymentCompletedProps({
        transactionId: undefined,
        reservationId: undefined,
        cartId: undefined,
      });

      const result = await scheduler.emitPaymentCompleted(props);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to emit payment completed event',
        InfrastructureError,
      );
      if (isFailure(result)) {
        expect(result.error.retryable).toBe(true);
      }
    });
  });

  describe('emitPaymentFailed', () => {
    it('calls queue.add with retry policy options (attempts: 5)', async () => {
      const props = PaymentDtoTestFactory.createPaymentFailedProps();

      const result = await scheduler.emitPaymentFailed(props);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockQueue.add).toHaveBeenCalledWith(
        JobNames.PAYMENT_FAILED,
        {
          ...props,
          correlationId: 'test-correlation-id',
        },
        expect.objectContaining({
          attempts: 5,
        }),
      );
    });

    it('returns an InfrastructureError when queue.add rejects', async () => {
      mockQueue.add.mockRejectedValue(new Error('Redis connection lost'));

      const props = PaymentDtoTestFactory.createPaymentFailedProps({
        reason: 'Card declined',
      });

      const result = await scheduler.emitPaymentFailed(props);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to emit payment failed event',
        InfrastructureError,
      );
      if (isFailure(result)) {
        expect(result.error.retryable).toBe(true);
      }
    });
  });
});
