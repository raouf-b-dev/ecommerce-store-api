import { Test, TestingModule } from '@nestjs/testing';
import { CreatePaymentIntentUseCase } from './create-payment-intent.usecase';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { Payment } from '../../../domain/entities/payment';
import { PaymentProvider } from '../../ports/payment-provider';
import {
  MockPaymentProvider,
  MockPaymentRepository,
  PaymentDtoTestFactory,
  PaymentEntityTestFactory,
  PaymentTestFactory,
} from 'src/modules/payments/testing';
import { ResultAssertionHelper } from '../../../../../../testing';
import { PaymentMapper } from '../../../../secondary-adapters/persistence/mappers/payment.mapper';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { InfrastructureError } from '../../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { DomainError } from '../../../../../../shared-kernel/domain/exceptions/domain.error';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { StatusCode } from '../../../../../../shared-kernel/domain/exceptions/status-code';
import { ErrorCode } from '../../../../../../shared-kernel/domain/exceptions/error-code';
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { Money } from '../../../../../../shared-kernel/domain/value-objects/money';

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
    paymentRepository.findByOrderId.mockResolvedValue(Result.success([]));
  });

  afterEach(() => {
    paymentRepository.reset();
    paymentProvider.reset();
  });

  it('creates payment intent successfully by saving first then initiating with idempotency key', async () => {
    const command = PaymentDtoTestFactory.createCreatePaymentIntentCommand();

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
    const savedPayment = paymentRepository.save.mock.calls[0][0];
    expect(savedPayment.providerId.equals(paymentProvider.id)).toBe(true);
    expect(savedPayment.provider).toBe(paymentProvider.id.value);
    const expectedMoney = Money.create(command.amount, command.currency);
    ResultAssertionHelper.assertResultSuccess(expectedMoney);
    expect(paymentProvider.initiatePayment).toHaveBeenCalledWith({
      amount: expectedMoney.value,
      metadata: { orderId: String(command.orderId) },
      idempotencyKey: 'payment-intent-42',
    });
    expect(paymentRepository.update).toHaveBeenCalledTimes(1);
  });

  it('reuses existing pending payment row and its id for idempotency key on retry', async () => {
    const command = PaymentDtoTestFactory.createCreatePaymentIntentCommand();

    const pendingPayment = Payment.fromPrimitives(
      PaymentTestFactory.createPendingPayment({
        id: 42,
        orderId: command.orderId,
        amount: command.amount,
        currency: command.currency,
        paymentMethod: command.paymentMethod,
        userId: command.userId,
        gatewayPaymentIntentId: null,
        gatewayClientSecret: null,
      }),
    );

    paymentRepository.findByOrderId.mockResolvedValue(
      Result.success([pendingPayment]),
    );
    paymentRepository.update.mockImplementation((p) =>
      Promise.resolve(Result.success(p)),
    );

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.paymentId).toBe(42);
    expect(result.value.clientSecret).toBe('pi_mock_123_secret_xyz');

    expect(paymentRepository.save).not.toHaveBeenCalled();
    const expectedMoney = Money.create(command.amount, command.currency);
    ResultAssertionHelper.assertResultSuccess(expectedMoney);
    expect(paymentProvider.initiatePayment).toHaveBeenCalledWith({
      amount: expectedMoney.value,
      metadata: { orderId: String(command.orderId) },
      idempotencyKey: 'payment-intent-42',
    });
    expect(paymentRepository.update).toHaveBeenCalledTimes(1);
  });

  it('returns existing pending payment directly when provider reference is already present', async () => {
    const command = PaymentDtoTestFactory.createCreatePaymentIntentCommand();

    const pendingPayment = Payment.fromPrimitives(
      PaymentTestFactory.createPendingPayment({
        id: 42,
        orderId: command.orderId,
        amount: command.amount,
        currency: command.currency,
        paymentMethod: command.paymentMethod,
        userId: command.userId,
        gatewayPaymentIntentId: 'pi_mock_existing',
        gatewayClientSecret: 'pi_mock_existing_secret',
      }),
    );

    paymentRepository.findByOrderId.mockResolvedValue(
      Result.success([pendingPayment]),
    );

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.paymentId).toBe(42);
    expect(result.value.clientSecret).toBe('pi_mock_existing_secret');

    expect(paymentRepository.save).not.toHaveBeenCalled();
    expect(paymentProvider.initiatePayment).not.toHaveBeenCalled();
    expect(paymentRepository.update).not.toHaveBeenCalled();
  });

  it('fails with 409 and PAYMENT_PROVIDER_MISMATCH when pending payment provider differs from bound provider', async () => {
    const command = PaymentDtoTestFactory.createCreatePaymentIntentCommand();

    const pendingPayment = Payment.fromPrimitives(
      PaymentTestFactory.createPendingPayment({
        id: 42,
        orderId: command.orderId,
        amount: command.amount,
        currency: command.currency,
        paymentMethod: command.paymentMethod,
        userId: command.userId,
        provider: 'other-provider',
      }),
    );

    paymentRepository.findByOrderId.mockResolvedValue(
      Result.success([pendingPayment]),
    );

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      `Payment provider other-provider does not match active provider ${paymentProvider.id.value}`,
      UseCaseError,
    );
    expect(result.error.statusCode).toBe(StatusCode.CONFLICT);
    expect(result.error.code).toBe(ErrorCode.PAYMENT_PROVIDER_MISMATCH);
    expect(paymentRepository.save).not.toHaveBeenCalled();
    expect(paymentProvider.initiatePayment).not.toHaveBeenCalled();
  });

  it('fails with status 409 when pending payment money differs from command money', async () => {
    const command = PaymentDtoTestFactory.createCreatePaymentIntentCommand({
      amount: 200,
    });

    const pendingPayment = Payment.fromPrimitives(
      PaymentTestFactory.createPendingPayment({
        id: 42,
        orderId: command.orderId,
        amount: 100,
        currency: command.currency,
        paymentMethod: command.paymentMethod,
        userId: command.userId,
      }),
    );

    paymentRepository.findByOrderId.mockResolvedValue(
      Result.success([pendingPayment]),
    );

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      `Payment amount or currency does not match pending payment for order ${command.orderId}`,
      UseCaseError,
    );
    expect(result.error.statusCode).toBe(StatusCode.CONFLICT);
    expect(result.error.code).toBe(ErrorCode.PAYMENT_AMOUNT_MISMATCH);
    expect(paymentRepository.save).not.toHaveBeenCalled();
    expect(paymentProvider.initiatePayment).not.toHaveBeenCalled();
  });

  it('fails when order has only non-pending payments', async () => {
    const command = PaymentDtoTestFactory.createCreatePaymentIntentCommand();

    const completedPayment = Payment.fromPrimitives(
      PaymentTestFactory.createMockPayment({
        id: 42,
        orderId: command.orderId,
        amount: command.amount,
        currency: command.currency,
        paymentMethod: command.paymentMethod,
        userId: command.userId,
        status: PaymentStatusType.COMPLETED,
      }),
    );

    paymentRepository.findByOrderId.mockResolvedValue(
      Result.success([completedPayment]),
    );

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      `Order ${command.orderId} does not have a pending payment to initiate intent`,
      UseCaseError,
    );
    expect(paymentRepository.save).not.toHaveBeenCalled();
    expect(paymentProvider.initiatePayment).not.toHaveBeenCalled();
  });

  it('returns collaborator failure as-is when findByOrderId fails', async () => {
    const command = PaymentDtoTestFactory.createCreatePaymentIntentCommand();

    const repoError = new RepositoryError('Database query failed', {
      retryable: true,
    });
    paymentRepository.findByOrderId.mockResolvedValueOnce(
      Result.failure(repoError),
    );

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Database query failed',
      RepositoryError,
    );
    expect(result.error).toBe(repoError);
    expect(result.error.retryable).toBe(true);
    expect(paymentRepository.save).not.toHaveBeenCalled();
    expect(paymentProvider.initiatePayment).not.toHaveBeenCalled();
  });

  it('returns collaborator failure as-is when amount is invalid', async () => {
    const command = PaymentDtoTestFactory.createCreatePaymentIntentCommand({
      amount: -100,
    });

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
    const command = PaymentDtoTestFactory.createCreatePaymentIntentCommand();

    const saveError = new RepositoryError('Database connection timeout', {
      retryable: true,
    });
    paymentRepository.save.mockResolvedValueOnce(Result.failure(saveError));

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Database connection timeout',
      RepositoryError,
    );
    expect(result.error).toBe(saveError);
    expect(result.error.retryable).toBe(true);
    expect(paymentProvider.initiatePayment).not.toHaveBeenCalled();
  });

  it('returns collaborator failure as-is when provider initiatePayment fails', async () => {
    const command = PaymentDtoTestFactory.createCreatePaymentIntentCommand();

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

    const initiateError = new InfrastructureError(
      'Payment network unavailable',
      { retryable: true },
    );
    paymentProvider.initiatePayment.mockResolvedValueOnce(
      Result.failure(initiateError),
    );

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment network unavailable',
      InfrastructureError,
    );
    expect(result.error).toBe(initiateError);
    expect(result.error.retryable).toBe(true);
    expect(paymentRepository.update).not.toHaveBeenCalled();
  });

  it('returns collaborator failure as-is when setPaymentIntent fails', async () => {
    const command = PaymentDtoTestFactory.createCreatePaymentIntentCommand();

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

    paymentProvider.initiatePayment.mockResolvedValueOnce(
      Result.success({
        providerReference: '',
        nextAction: {
          type: 'confirm_on_client',
          clientSecret: 'secret',
        },
      }),
    );

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment intent ID is required',
      DomainError,
    );
    expect(paymentRepository.update).not.toHaveBeenCalled();
  });

  it('returns collaborator failure as-is when update fails in repository', async () => {
    const command = PaymentDtoTestFactory.createCreatePaymentIntentCommand();

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

    const updateError = new RepositoryError('Database update timeout', {
      retryable: true,
    });
    paymentRepository.update.mockResolvedValueOnce(Result.failure(updateError));

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Database update timeout',
      RepositoryError,
    );
    expect(result.error).toBe(updateError);
    expect(result.error.retryable).toBe(true);
  });
});
