import { HandleStripeWebhookUseCase } from './handle-stripe-webhook.usecase';
import {
  MockStripeSignatureVerifier,
  MockHandlePaymentWebhookService,
  PaymentDtoTestFactory,
} from '../../../../testing';
import { PaymentEventType } from '../../../domain/value-objects/payment-event-type';
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ResultAssertionHelper, TEST_IDS } from '../../../../../../testing';

describe('HandleStripeWebhookUseCase', () => {
  let useCase: HandleStripeWebhookUseCase;
  let mockSignatureVerifier: MockStripeSignatureVerifier;
  let mockWebhookService: MockHandlePaymentWebhookService;

  beforeEach(() => {
    mockSignatureVerifier = new MockStripeSignatureVerifier();
    mockWebhookService = new MockHandlePaymentWebhookService();

    mockWebhookService.execute.mockResolvedValue(
      Result.success({
        orderId: TEST_IDS.order,
        paymentId: TEST_IDS.payment,
        status: PaymentStatusType.COMPLETED,
      }),
    );

    useCase = new HandleStripeWebhookUseCase(
      mockSignatureVerifier,
      mockWebhookService,
    );
  });

  afterEach(() => {
    mockSignatureVerifier.reset();
    mockWebhookService.reset();
  });

  it('maps paymentIntent.amount_received and paymentIntent.currency into amountMinor and currency', async () => {
    const payload = PaymentDtoTestFactory.createStripeWebhookPayload({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test123',
          amount_received: 5000,
          amount: 5000,
          currency: 'usd',
          metadata: { orderId: String(TEST_IDS.order) },
        },
      },
    });

    const command = PaymentDtoTestFactory.createStripeWebhookCommand({
      signature: 'valid_signature',
      payload,
    });

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockWebhookService.execute).toHaveBeenCalledWith({
      paymentIntentId: 'pi_test123',
      eventType: PaymentEventType.SUCCEEDED,
      transactionId: 'pi_test123',
      metadata: { orderId: String(TEST_IDS.order) },
      failureReason: undefined,
      amountMinor: 5000,
      currency: 'usd',
    });
  });

  it('falls back to paymentIntent.amount when amount_received is undefined', async () => {
    const payload = PaymentDtoTestFactory.createStripeWebhookPayload({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test123',
          amount: 7500,
          currency: 'eur',
          metadata: {},
        },
      },
    });

    const command = PaymentDtoTestFactory.createStripeWebhookCommand({
      signature: 'valid_signature',
      payload,
    });

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockWebhookService.execute).toHaveBeenCalledWith({
      paymentIntentId: 'pi_test123',
      eventType: PaymentEventType.SUCCEEDED,
      transactionId: 'pi_test123',
      metadata: {},
      failureReason: undefined,
      amountMinor: 7500,
      currency: 'eur',
    });
  });

  it('omits amountMinor and currency keys from dto when undefined in payload', async () => {
    const payload = PaymentDtoTestFactory.createStripeWebhookPayload({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test123',
          metadata: { orderId: String(TEST_IDS.order) },
        },
      },
    });

    const command = PaymentDtoTestFactory.createStripeWebhookCommand({
      signature: 'valid_signature',
      payload,
    });

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultSuccess(result);
    const calledDto = mockWebhookService.execute.mock.calls[0][0];
    expect(calledDto).not.toHaveProperty('amountMinor');
    expect(calledDto).not.toHaveProperty('currency');
    expect(calledDto).toEqual({
      paymentIntentId: 'pi_test123',
      eventType: PaymentEventType.SUCCEEDED,
      transactionId: 'pi_test123',
      metadata: { orderId: String(TEST_IDS.order) },
      failureReason: undefined,
    });
  });
});
