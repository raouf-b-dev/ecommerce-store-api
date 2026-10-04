import { HttpStatus } from '@nestjs/common';
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
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';

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

  it('rejects with BAD_REQUEST when stripe-signature header is missing', async () => {
    const result = await useCase.execute({
      signature: '',
      rawBody: Buffer.from('{"id":"evt_1"}'),
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Missing stripe-signature header',
      UseCaseError,
    );
    expect(result).toMatchObject({
      isFailure: true,
      error: { statusCode: HttpStatus.BAD_REQUEST },
    });
  });

  it('rejects with BAD_REQUEST when rawBody is undefined', async () => {
    const result = await useCase.execute({
      signature: 'valid_signature',
      rawBody: undefined,
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Missing raw request body',
      UseCaseError,
    );
    expect(result).toMatchObject({
      isFailure: true,
      error: { statusCode: HttpStatus.BAD_REQUEST },
    });
  });

  it('rejects with BAD_REQUEST when rawBody is empty', async () => {
    const result = await useCase.execute({
      signature: 'valid_signature',
      rawBody: Buffer.alloc(0),
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Missing raw request body',
      UseCaseError,
    );
    expect(result).toMatchObject({
      isFailure: true,
      error: { statusCode: HttpStatus.BAD_REQUEST },
    });
  });

  it('rejects with BAD_REQUEST when signature verification fails', async () => {
    mockSignatureVerifier.mockFailedVerification();

    const result = await useCase.execute({
      signature: 'invalid_signature',
      rawBody: Buffer.from('{"id":"evt_1"}'),
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Invalid Stripe webhook signature',
      UseCaseError,
    );
    expect(result).toMatchObject({
      isFailure: true,
      error: { statusCode: HttpStatus.BAD_REQUEST },
    });
  });

  it('passes the exact rawBody Buffer and signature to the verifier', async () => {
    const rawBytes = Buffer.from(
      JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { object: { id: paymentIntentId } },
      }),
    );
    const payload = PaymentDtoTestFactory.createStripeWebhookPayload({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          amount: 5000,
          currency: 'usd',
          metadata: { orderId: String(TEST_IDS.order) },
        },
      },
    });
    mockSignatureVerifier.mockSuccessfulVerification(payload);

    const result = await useCase.execute({
      signature: 'whsec_signature_123',
      rawBody: rawBytes,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockSignatureVerifier.verify).toHaveBeenCalledWith(
      rawBytes,
      'whsec_signature_123',
    );
  });

  it('returns success(null) when event type is ignored', async () => {
    const executeSpy = jest.spyOn(webhookService, 'execute');
    const payload = PaymentDtoTestFactory.createStripeWebhookPayload({
      type: 'payment_intent.created',
      data: {
        object: {
          id: paymentIntentId,
          metadata: {},
        },
      },
    });
    mockSignatureVerifier.mockSuccessfulVerification(payload);

    const result = await useCase.execute({
      signature: 'valid_signature',
      rawBody: Buffer.from('{}'),
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toBeNull();
    expect(executeSpy).not.toHaveBeenCalled();
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
    mockSignatureVerifier.mockSuccessfulVerification(payload);

    const command = PaymentDtoTestFactory.createStripeWebhookCommand({
      signature: 'valid_signature',
      rawBody: Buffer.from(JSON.stringify(payload)),
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
    mockSignatureVerifier.mockSuccessfulVerification(payload);

    const command = PaymentDtoTestFactory.createStripeWebhookCommand({
      signature: 'valid_signature',
      rawBody: Buffer.from(JSON.stringify(payload)),
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
    mockSignatureVerifier.mockSuccessfulVerification(payload);

    const command = PaymentDtoTestFactory.createStripeWebhookCommand({
      signature: 'valid_signature',
      rawBody: Buffer.from(JSON.stringify(payload)),
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

  it('delegates payment_intent.payment_failed event with failureReason', async () => {
    const executeSpy = jest.spyOn(webhookService, 'execute');
    const payload = PaymentDtoTestFactory.createStripeWebhookPayload({
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: paymentIntentId,
          metadata: { orderId: String(TEST_IDS.order) },
          last_payment_error: {
            message: 'Your card has expired',
          },
        },
      },
    });
    mockSignatureVerifier.mockSuccessfulVerification(payload);

    const command = PaymentDtoTestFactory.createStripeWebhookCommand({
      signature: 'valid_signature',
      rawBody: Buffer.from(JSON.stringify(payload)),
    });

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(executeSpy).toHaveBeenCalledWith({
      paymentIntentId,
      eventType: PaymentEventType.FAILED,
      transactionId: paymentIntentId,
      metadata: { orderId: String(TEST_IDS.order) },
      failureReason: 'Your card has expired',
    });
  });

  it('rejects with BAD_REQUEST when payment intent id is missing', async () => {
    const payload = PaymentDtoTestFactory.createStripeWebhookPayload({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: '',
          metadata: {},
        },
      },
    });
    mockSignatureVerifier.mockSuccessfulVerification(payload);

    const command = PaymentDtoTestFactory.createStripeWebhookCommand({
      signature: 'valid_signature',
      rawBody: Buffer.from(JSON.stringify(payload)),
    });

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Invalid Stripe webhook payload: missing payment intent',
      UseCaseError,
    );
    expect(result).toMatchObject({
      isFailure: true,
      error: { statusCode: HttpStatus.BAD_REQUEST },
    });
  });

  it('propagates failure when handlePaymentWebhookService fails', async () => {
    jest
      .spyOn(webhookService, 'execute')
      .mockResolvedValue(
        ErrorFactory.UseCaseError('Payment processing failed in service'),
      );

    const payload = PaymentDtoTestFactory.createStripeWebhookPayload({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          metadata: { orderId: String(TEST_IDS.order) },
        },
      },
    });
    mockSignatureVerifier.mockSuccessfulVerification(payload);

    const command = PaymentDtoTestFactory.createStripeWebhookCommand({
      signature: 'valid_signature',
      rawBody: Buffer.from(JSON.stringify(payload)),
    });

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment processing failed in service',
      UseCaseError,
    );
  });
});
