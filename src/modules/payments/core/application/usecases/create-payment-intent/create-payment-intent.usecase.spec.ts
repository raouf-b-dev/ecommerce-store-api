import { Test, TestingModule } from '@nestjs/testing';
import { CreatePaymentIntentUseCase } from './create-payment-intent.usecase';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { PaymentProviderResolver } from '../../ports/payment-provider-resolver';
import {
  MockPaymentProvider,
  MockPaymentProviderResolver,
  MockPaymentRepository,
  PaymentEntityTestFactory,
} from 'src/modules/payments/testing';
import { PaymentMethodType } from '../../../../../../shared-kernel/domain/value-objects/payment-method';
import { ResultAssertionHelper } from '../../../../../../testing';
import { PaymentMapper } from '../../../../secondary-adapters/persistence/mappers/payment.mapper';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { CreatePaymentIntentCommand } from '../../commands/create-payment-intent.command';

describe('CreatePaymentIntentUseCase', () => {
  let useCase: CreatePaymentIntentUseCase;
  let paymentRepository: MockPaymentRepository;
  let providerResolver: MockPaymentProviderResolver;
  let defaultProvider: MockPaymentProvider;

  beforeEach(async () => {
    providerResolver = new MockPaymentProviderResolver();
    defaultProvider = providerResolver.getDefaultProvider();
    defaultProvider.mockSuccessfulInitiatePayment(
      'pi_mock_123',
      'pi_mock_123_secret_xyz',
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePaymentIntentUseCase,
        {
          provide: PaymentRepository,
          useClass: MockPaymentRepository,
        },
        {
          provide: PaymentProviderResolver,
          useValue: providerResolver,
        },
      ],
    }).compile();

    useCase = module.get<CreatePaymentIntentUseCase>(
      CreatePaymentIntentUseCase,
    );
    paymentRepository = module.get<MockPaymentRepository>(PaymentRepository);
  });

  afterEach(() => {
    paymentRepository.reset();
    providerResolver.reset();
  });

  it('creates payment intent successfully when input is valid', async () => {
    const command: CreatePaymentIntentCommand = {
      orderId: 101,
      amount: 5000,
      currency: 'USD',
      paymentMethod: PaymentMethodType.STRIPE,
      userId: 5,
      metadata: { orderId: '101' },
    };

    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 42,
      orderId: command.orderId,
      amount: command.amount,
      currency: command.currency,
      paymentMethod: command.paymentMethod,
      userId: command.userId,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);
    paymentRepository.mockSuccessfulSave(payment);

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.paymentId).toBe(42);
    expect(result.value.clientSecret).toBe('pi_mock_123_secret_xyz');
    expect(defaultProvider.initiatePayment).toHaveBeenCalledTimes(1);
    expect(paymentRepository.save).toHaveBeenCalledTimes(1);
  });

  it('fails when amount is invalid', async () => {
    const command: CreatePaymentIntentCommand = {
      orderId: 101,
      amount: -100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.STRIPE,
      userId: 5,
    };

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Invalid payment amount: Amount must be a non-negative integer in minor units',
    );
    expect(defaultProvider.initiatePayment).not.toHaveBeenCalled();
    expect(paymentRepository.save).not.toHaveBeenCalled();
  });

  it('fails when provider returns infrastructure error', async () => {
    const command: CreatePaymentIntentCommand = {
      orderId: 101,
      amount: 5000,
      currency: 'USD',
      paymentMethod: PaymentMethodType.STRIPE,
      userId: 5,
    };

    defaultProvider.initiatePayment.mockResolvedValueOnce(
      ErrorFactory.InfrastructureError('Stripe rate limit exceeded'),
    );

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to create payment intent: Stripe rate limit exceeded',
    );
    expect(paymentRepository.save).not.toHaveBeenCalled();
  });

  it('fails when saving payment fails in repository', async () => {
    const command: CreatePaymentIntentCommand = {
      orderId: 101,
      amount: 5000,
      currency: 'USD',
      paymentMethod: PaymentMethodType.STRIPE,
      userId: 5,
    };

    paymentRepository.mockSaveFailure('Database disk full');

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to save payment',
      UseCaseError,
    );
  });
});
