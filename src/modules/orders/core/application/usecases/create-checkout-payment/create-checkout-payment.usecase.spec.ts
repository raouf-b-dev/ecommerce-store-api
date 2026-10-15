import { Test, TestingModule } from '@nestjs/testing';
import { CreateCheckoutPaymentUseCase } from './create-checkout-payment.usecase';
import { PaymentGateway } from '../../ports/payment.gateway';
import { PaymentMethodType } from '../../../../../../shared-kernel/domain/value-objects/payment-method';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { StatusCode } from '../../../../../../shared-kernel/domain/exceptions/status-code';
import { ResultAssertionHelper } from '../../../../../../testing';

describe('CreateCheckoutPaymentUseCase', () => {
  let useCase: CreateCheckoutPaymentUseCase;
  let createPaymentIntent: jest.MockedFunction<
    PaymentGateway['createPaymentIntent']
  >;

  const input = {
    orderId: 1,
    amount: 2550,
    currency: 'USD',
    paymentMethod: PaymentMethodType.CARD,
    userId: 10,
  };

  beforeEach(async () => {
    createPaymentIntent = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateCheckoutPaymentUseCase,
        {
          provide: PaymentGateway,
          useValue: { createPaymentIntent },
        },
      ],
    }).compile();

    useCase = module.get<CreateCheckoutPaymentUseCase>(
      CreateCheckoutPaymentUseCase,
    );
  });

  it('returns successful payment intent result', async () => {
    createPaymentIntent.mockResolvedValue(
      Result.success({ paymentId: 42, clientSecret: 'secret_123' }),
    );

    const result = await useCase.execute(input);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      paymentId: 42,
      clientSecret: 'secret_123',
    });
  });

  it('returns failure from PaymentGateway unchanged', async () => {
    const failure = ErrorFactory.RepositoryError(
      'Pending payment already exists for order',
      { status: StatusCode.CONFLICT, retryable: true },
    );
    createPaymentIntent.mockResolvedValue(failure);

    const result = await useCase.execute(input);

    expect(result).toBe(failure);
    ResultAssertionHelper.assertResultFailure(result);
    expect(result.error.retryable).toBe(true);
  });
});
