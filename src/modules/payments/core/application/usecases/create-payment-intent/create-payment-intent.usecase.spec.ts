import { Test, TestingModule } from '@nestjs/testing';
import { CreatePaymentIntentUseCase } from './create-payment-intent.usecase';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { PaymentProvider } from '../../ports/payment-provider';
import {
  MockPaymentProvider,
  MockPaymentRepository,
  PaymentEntityTestFactory,
} from 'src/modules/payments/testing';
import { PaymentMethodType } from '../../../../../../shared-kernel/domain/value-objects/payment-method';
import { ResultAssertionHelper } from '../../../../../../testing';
import { PaymentMapper } from '../../../../secondary-adapters/persistence/mappers/payment.mapper';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { InfrastructureError } from '../../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { DomainError } from '../../../../../../shared-kernel/domain/exceptions/domain.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { CreatePaymentIntentCommand } from '../../commands/create-payment-intent.command';

describe('CreatePaymentIntentUseCase', () => {
  let useCase: CreatePaymentIntentUseCase;
  let paymentRepository: MockPaymentRepository;
  let paymentProvider: MockPaymentProvider;

  beforeEach(async () => {
    paymentProvider = new MockPaymentProvider();
    paymentProvider.mockSuccessfulInitiatePayment(
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
          provide: PaymentProvider,
          useValue: paymentProvider,
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
    paymentProvider.reset();
  });

  it('creates payment intent successfully by saving first then initiating with idempotency key', async () => {
    const command: CreatePaymentIntentCommand = {
      orderId: 101,
      amount: 5000,
      currency: 'USD',
      paymentMethod: PaymentMethodType.STRIPE,
      userId: 5,
      metadata: { orderId: '101' },
    };

    const paymentEntity = PaymentEntityTestFactory.createPendingEntity({
      id: 42,
      orderId: command.orderId,
      amount: command.amount,
      currency: command.currency,
      paymentMethod: command.paymentMethod,
      userId: command.userId,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulSave(payment);
    paymentRepository.update.mockImplementation((p) =>
      Promise.resolve(Result.success(p)),
    );

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.paymentId).toBe(42);
    expect(result.value.clientSecret).toBe('pi_mock_123_secret_xyz');

    expect(paymentRepository.save).toHaveBeenCalledTimes(1);
    expect(paymentProvider.initiatePayment).toHaveBeenCalledWith({
      amount: expect.objectContaining({ amount: 5000, currency: 'USD' }),
      metadata: { orderId: '101' },
      idempotencyKey: 'payment-intent-42',
    });
    expect(paymentRepository.update).toHaveBeenCalledTimes(1);
  });

  it('returns collaborator failure as-is when amount is invalid', async () => {
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
      'Amount must be a non-negative integer in minor units',
      DomainError,
    );
    expect(paymentRepository.save).not.toHaveBeenCalled();
    expect(paymentProvider.initiatePayment).not.toHaveBeenCalled();
  });

  it('returns collaborator failure as-is when initial save fails', async () => {
    const command: CreatePaymentIntentCommand = {
      orderId: 101,
      amount: 5000,
      currency: 'USD',
      paymentMethod: PaymentMethodType.STRIPE,
      userId: 5,
    };

    paymentRepository.mockSaveFailure('Database connection timeout');

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Database connection timeout',
      RepositoryError,
    );
    expect(paymentProvider.initiatePayment).not.toHaveBeenCalled();
  });

  it('returns collaborator failure as-is when provider initiatePayment fails', async () => {
    const command: CreatePaymentIntentCommand = {
      orderId: 101,
      amount: 5000,
      currency: 'USD',
      paymentMethod: PaymentMethodType.STRIPE,
      userId: 5,
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

    paymentProvider.initiatePayment.mockResolvedValueOnce(
      ErrorFactory.InfrastructureError('Payment network unavailable', {
        retryable: true,
      }),
    );

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment network unavailable',
      InfrastructureError,
    );
    expect(result).toMatchObject({
      isFailure: true,
      error: { retryable: true },
    });
    expect(paymentRepository.update).not.toHaveBeenCalled();
  });
});
