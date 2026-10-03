import { HandleStripeWebhookUseCase } from './handle-stripe-webhook.usecase';
import {
  MockStripeSignatureVerifier,
  MockPaymentRepository,
  MockPaymentEventsScheduler,
  PaymentTestFactory,
  PaymentDtoTestFactory,
} from '../../../../testing';
import { PaymentEventType } from '../../../domain/value-objects/payment-event-type';
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ResultAssertionHelper, TEST_IDS } from '../../../../../../testing';
import { HandlePaymentWebhookService } from '../../services/handle-payment-webhook/handle-payment-webhook.service';

describe('HandleStripeWebhookUseCase', () => {
  let useCase: HandleStripeWebhookUseCase;
  let mockSignatureVerifier: MockStripeSignatureVerifier;
  let webhookService: HandlePaymentWebhookService;
  let paymentRepository: MockPaymentRepository;
  let paymentEventsScheduler: MockPaymentEventsScheduler;

  const paymentIntentId = 'pi_test123';

  beforeEach(() => {
    mockSignatureVerifier = new MockStripeSignatureVerifier();
    paymentRepository = new MockPaymentRepository();
    paymentEventsScheduler = new MockPaymentEventsScheduler();
    webhookService = new HandlePaymentWebhookService(
      paymentRepository,
      paymentEventsScheduler,
    );

    const payment = PaymentTestFactory.createDomainPayment({
      id: TEST_IDS.payment,
      orderId: TEST_IDS.order,
      amount: 50,
      currency: 'USD',
      status: PaymentStatusType.PENDING,
      gatewayPaymentIntentId: paymentIntentId,
    });

    paymentRepository.findByGatewayPaymentIntentId.mockResolvedValue(
      Result.success(payment),
    );
    paymentRepository.update.mockResolvedValue(Result.success(payment));

    useCase = new HandleStripeWebhookUseCase(
      mockSignatureVerifier,
      webhookService,
    );
  });

  afterEach(() => {
    mockSignatureVerifier.reset();
    paymentRepository.reset();
    paymentEventsScheduler.reset();
  });

  it('maps paymentIntent.amount_received and paymentIntent.currency into amountMinor and currency', async () => {
    const executeSpy = jest.spyOn(webhookService, 'execute');
    const payload = PaymentDtoTestFactory.createStripeWebhookPayload({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
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
    expect(executeSpy).toHaveBeenCalledWith({
      paymentIntentId,
      eventType: PaymentEventType.SUCCEEDED,
      transactionId: paymentIntentId,
      metadata: { orderId: String(TEST_IDS.order) },
      failureReason: undefined,
      amountMinor: 5000,
      currency: 'usd',
    });
  });

  it('falls back to paymentIntent.amount when amount_received is undefined', async () => {
    const executeSpy = jest.spyOn(webhookService, 'execute');
    const payload = PaymentDtoTestFactory.createStripeWebhookPayload({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          amount: 5000,
          currency: 'usd',
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
    expect(executeSpy).toHaveBeenCalledWith({
      paymentIntentId,
      eventType: PaymentEventType.SUCCEEDED,
      transactionId: paymentIntentId,
      metadata: {},
      failureReason: undefined,
      amountMinor: 5000,
      currency: 'usd',
    });
  });

  it('omits amountMinor and currency keys from dto when undefined in payload', async () => {
    const executeSpy = jest.spyOn(webhookService, 'execute');
    const payload = PaymentDtoTestFactory.createStripeWebhookPayload({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
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
    const calledDto = executeSpy.mock.calls[0][0];
    expect(calledDto).not.toHaveProperty('amountMinor');
    expect(calledDto).not.toHaveProperty('currency');
    expect(calledDto).toEqual({
      paymentIntentId,
      eventType: PaymentEventType.SUCCEEDED,
      transactionId: paymentIntentId,
      metadata: { orderId: String(TEST_IDS.order) },
      failureReason: undefined,
    });
  });
});
