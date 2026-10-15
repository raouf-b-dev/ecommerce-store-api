import {
  MockPaymentProvider,
  MockPaymentRepository,
  PaymentEntityTestFactory,
} from 'src/modules/payments/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { ProcessRefundUseCase } from './process-refund.usecase';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { ProcessRefundCommand } from '../../commands/process-refund.command';
import { ResultAssertionHelper } from '../../../../../../testing';
import { PaymentMapper } from '../../../../secondary-adapters/persistence/mappers/payment.mapper';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { PaymentProvider } from '../../ports/payment-provider';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
import { StatusCode } from '../../../../../../shared-kernel/domain/exceptions/status-code';
import { ErrorCode } from '../../../../../../shared-kernel/domain/exceptions/error-code';

describe('ProcessRefundUseCase', () => {
  let useCase: ProcessRefundUseCase;
  let paymentRepository: MockPaymentRepository;
  let defaultProvider: MockPaymentProvider;

  beforeEach(async () => {
    defaultProvider = new MockPaymentProvider();
    defaultProvider.mockSuccessfulRefund();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessRefundUseCase,
        {
          provide: PaymentRepository,
          useClass: MockPaymentRepository,
        },
        {
          provide: PaymentProvider,
          useValue: defaultProvider,
        },
        {
          provide: DomainEventPublisher,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get<ProcessRefundUseCase>(ProcessRefundUseCase);
    paymentRepository = module.get<MockPaymentRepository>(PaymentRepository);
  });

  afterEach(() => {
    paymentRepository.reset();
    defaultProvider.reset();
  });

  it('should fail if refund amount is zero or negative', async () => {
    const zeroResult = await useCase.execute({
      paymentId: 123,
      amount: 0,
    });

    ResultAssertionHelper.assertResultFailure(
      zeroResult,
      'Refund amount must be greater than zero',
    );

    const negativeResult = await useCase.execute({
      paymentId: 123,
      amount: -10,
    });

    ResultAssertionHelper.assertResultFailure(
      negativeResult,
      'Refund amount must be greater than zero',
    );
    expect(paymentRepository.findById).not.toHaveBeenCalled();
  });

  it('should process a refund successfully and pass idempotency key', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 123,
      amount: 100,
      refundedAmount: 0,
      transactionId: 'txn_123',
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());
    paymentRepository.update.mockImplementation((p) =>
      Promise.resolve(Result.success(p)),
    );

    const command: ProcessRefundCommand = {
      paymentId: 123,
      amount: 50,
      reason: 'Defective product',
    };

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(paymentRepository.findById).toHaveBeenCalledWith(123);
    const updatedPayment = result.value;
    expect(updatedPayment.refundedAmount).toBe(5000);
    expect(defaultProvider.refund).toHaveBeenCalledWith({
      providerReference: 'txn_123',
      amount: expect.objectContaining({ amount: 5000, currency: 'USD' }),
      idempotencyKey: 'refund-123-0',
    });
  });

  it('should fail if payment is not found', async () => {
    paymentRepository.mockPaymentNotFound(123);

    const command: ProcessRefundCommand = {
      paymentId: 123,
      amount: 50,
    };

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment with id 123 not found',
    );
    expect(paymentRepository.findById).toHaveBeenCalledWith(123);
  });

  it('should fail if refund amount exceeds payment amount', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 123,
      amount: 100,
      refundedAmount: 0,
      transactionId: 'txn_123',
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());

    const command: ProcessRefundCommand = {
      paymentId: 123,
      amount: 150,
    };

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Refund amount exceeds remaining payment amount',
    );
    expect(defaultProvider.refund).not.toHaveBeenCalled();
  });

  it('returns success idempotently without calling provider if payment is already REFUNDED', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 123,
      amount: 100,
      refundedAmount: 100,
      status: PaymentStatusType.REFUNDED,
      transactionId: 'txn_123',
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());

    const command: ProcessRefundCommand = {
      paymentId: 123,
      amount: 100,
    };

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(defaultProvider.refund).not.toHaveBeenCalled();
    expect(paymentRepository.update).not.toHaveBeenCalled();
  });

  it('returns success idempotently for an already REFUNDED payment even when the retry amount is invalid for the currency', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 123,
      amount: 1000,
      currency: 'JPY',
      refundedAmount: 1000,
      status: PaymentStatusType.REFUNDED,
      transactionId: 'txn_123',
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());

    const command: ProcessRefundCommand = {
      paymentId: 123,
      amount: 100.5,
    };

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(defaultProvider.refund).not.toHaveBeenCalled();
    expect(paymentRepository.update).not.toHaveBeenCalled();
  });

  it('fails without calling provider if payment cannot be refunded in current status', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 123,
      amount: 100,
      refundedAmount: 0,
      status: PaymentStatusType.PENDING,
      transactionId: 'txn_123',
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());

    const command: ProcessRefundCommand = {
      paymentId: 123,
      amount: 50,
    };

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment cannot be refunded in current status',
    );
    expect(defaultProvider.refund).not.toHaveBeenCalled();
  });

  it('fails with UseCaseError on a provider mismatch and calls nothing on provider', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 123,
      amount: 100,
      refundedAmount: 0,
      status: PaymentStatusType.COMPLETED,
      transactionId: 'txn_123',
      provider: 'other-provider',
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());

    const command: ProcessRefundCommand = {
      paymentId: 123,
      amount: 50,
    };

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment provider other-provider does not match active provider stripe',
    );
    expect(result.error.statusCode).toBe(StatusCode.CONFLICT);
    expect(result.error.code).toBe(ErrorCode.PAYMENT_PROVIDER_MISMATCH);
    expect(defaultProvider.refund).not.toHaveBeenCalled();
    expect(paymentRepository.update).not.toHaveBeenCalled();
  });

  it('propagates retryable === true when provider fails with retryable InfrastructureError', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 123,
      amount: 100,
      refundedAmount: 0,
      status: PaymentStatusType.COMPLETED,
      transactionId: 'txn_123',
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());
    const providerError = new InfrastructureError('Gateway network timeout', {
      retryable: true,
    });
    defaultProvider.refund.mockResolvedValueOnce(Result.failure(providerError));

    const command: ProcessRefundCommand = {
      paymentId: 123,
      amount: 50,
    };

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Gateway network timeout',
      InfrastructureError,
    );
    expect(result.error).toBe(providerError);
    expect(result.error.retryable).toBe(true);
  });

  it('yields retryable === false when provider returns a non-retryable error', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 123,
      amount: 100,
      refundedAmount: 0,
      status: PaymentStatusType.COMPLETED,
      transactionId: 'txn_123',
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());
    const providerError = new InfrastructureError(
      'Card issuer declined refund',
      { retryable: false },
    );
    defaultProvider.refund.mockResolvedValueOnce(Result.failure(providerError));

    const command: ProcessRefundCommand = {
      paymentId: 123,
      amount: 50,
    };

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Card issuer declined refund',
      InfrastructureError,
    );
    expect(result.error).toBe(providerError);
    expect(result.error.retryable).toBe(false);
  });

  it('validates refund amount against payment currency with 0 decimals (JPY)', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 123,
      amount: 1000,
      currency: 'JPY',
      refundedAmount: 0,
      transactionId: 'txn_123',
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());
    paymentRepository.update.mockImplementation((p) =>
      Promise.resolve(Result.success(p)),
    );

    const command: ProcessRefundCommand = {
      paymentId: 123,
      amount: 500,
    };

    const result = await useCase.execute(command);
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.refundedAmount).toBe(500);
    expect(defaultProvider.refund).toHaveBeenCalledWith({
      providerReference: 'txn_123',
      amount: expect.objectContaining({ amount: 500, currency: 'JPY' }),
      idempotencyKey: 'refund-123-0',
    });
  });

  it('validates refund amount against payment currency with 3 decimals (KWD)', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 123,
      amount: 10,
      currency: 'KWD',
      refundedAmount: 0,
      transactionId: 'txn_123',
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());
    paymentRepository.update.mockImplementation((p) =>
      Promise.resolve(Result.success(p)),
    );

    const command: ProcessRefundCommand = {
      paymentId: 123,
      amount: 1.234,
    };

    const result = await useCase.execute(command);
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.refundedAmount).toBe(1234);
    expect(defaultProvider.refund).toHaveBeenCalledWith({
      providerReference: 'txn_123',
      amount: expect.objectContaining({ amount: 1234, currency: 'KWD' }),
      idempotencyKey: 'refund-123-0',
    });
  });

  it('rejects refund when amount has too many decimal places for currency', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 123,
      amount: 100,
      currency: 'USD',
      refundedAmount: 0,
      transactionId: 'txn_123',
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());

    const command: ProcessRefundCommand = {
      paymentId: 123,
      amount: 1.2345,
    };

    const result = await useCase.execute(command);
    ResultAssertionHelper.assertResultFailure(
      result,
      'Amount must be a non-negative decimal',
    );
    expect(result.error.statusCode).toBe(400);
    expect(defaultProvider.refund).not.toHaveBeenCalled();
  });
});
