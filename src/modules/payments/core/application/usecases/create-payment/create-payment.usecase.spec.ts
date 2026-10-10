import {
  MockPaymentProvider,
  MockPaymentRepository,
  PaymentEntityTestFactory,
} from 'src/modules/payments/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { CreatePaymentUseCase } from './create-payment.usecase';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { PaymentProvider } from '../../ports/payment-provider';
import { CreatePaymentCommand } from '../../commands/create-payment.command';
import { PaymentMethodType } from '../../../../../../shared-kernel/domain/value-objects/payment-method';
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
import { ResultAssertionHelper } from '../../../../../../testing';
import { PaymentMapper } from '../../../../secondary-adapters/persistence/mappers/payment.mapper';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { InfrastructureError } from '../../../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { DomainError } from '../../../../../../shared-kernel/domain/exceptions/domain.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { createUserCallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('CreatePaymentUseCase', () => {
  let useCase: CreatePaymentUseCase;
  let paymentRepository: MockPaymentRepository;
  let paymentProvider: MockPaymentProvider;

  const customerContext = createUserCallerContext({
    userId: 2,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_orders']),
  });

  const otherCustomerContext = createUserCallerContext({
    userId: 99,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_orders']),
  });

  beforeEach(async () => {
    paymentProvider = new MockPaymentProvider();
    paymentProvider.mockSuccessfulAuthorize('txn_123');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePaymentUseCase,
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

    useCase = module.get<CreatePaymentUseCase>(CreatePaymentUseCase);
    paymentRepository = module.get<MockPaymentRepository>(PaymentRepository);
  });

  afterEach(() => {
    paymentRepository.reset();
    paymentProvider.reset();
  });

  it('should create a payment successfully', async () => {
    const dto: CreatePaymentCommand = {
      orderId: 123,
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.CARD,
      userId: 2,
      paymentMethodDetails: { cardLast4: '4242' },
      callerContext: customerContext,
    };

    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      orderId: dto.orderId,
      amount: dto.amount,
      currency: dto.currency,
      paymentMethod: dto.paymentMethod,
      userId: dto.userId,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulSave(payment);

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(paymentRepository.save).toHaveBeenCalled();
    expect(result.value.orderId).toBe(dto.orderId);
  });

  it('saves FAILED payment when authorization outcome is failed (declined)', async () => {
    const dto: CreatePaymentCommand = {
      orderId: 123,
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.CARD,
      userId: 2,
      paymentMethodDetails: { cardLast4: '4242' },
      callerContext: customerContext,
    };

    paymentProvider.mockDeclinedAuthorize('Card was declined');

    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      orderId: dto.orderId,
      amount: dto.amount,
      currency: dto.currency,
      paymentMethod: dto.paymentMethod,
      userId: dto.userId,
      status: PaymentStatusType.FAILED,
      failureReason: 'Card was declined',
    });
    const payment = PaymentMapper.toDomain(paymentEntity);
    paymentRepository.mockSuccessfulSave(payment);

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(paymentRepository.save).toHaveBeenCalled();
    expect(result.value.status).toBe(PaymentStatusType.FAILED);
    expect(result.value.failureReason).toBe('Card was declined');
  });

  it('saves CAPTURED payment when authorization outcome is captured', async () => {
    const dto: CreatePaymentCommand = {
      orderId: 123,
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.CARD,
      userId: 2,
      paymentMethodDetails: { cardLast4: '4242' },
      callerContext: customerContext,
    };

    paymentProvider.mockSuccessfulAuthorize('txn_123', 'captured');

    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      orderId: dto.orderId,
      amount: dto.amount,
      currency: dto.currency,
      paymentMethod: dto.paymentMethod,
      userId: dto.userId,
      status: PaymentStatusType.CAPTURED,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);
    paymentRepository.mockSuccessfulSave(payment);

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(paymentRepository.save).toHaveBeenCalled();
    const saved = paymentRepository.save.mock.calls[0][0];
    expect(saved.status).toBe(PaymentStatusType.CAPTURED);
    expect(result.value.status).toBe(PaymentStatusType.CAPTURED);
  });

  it('fails when user is not authorized to create payment for order', async () => {
    const dto: CreatePaymentCommand = {
      orderId: 123,
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.CARD,
      userId: 2,
      callerContext: otherCustomerContext,
    };

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultFailure(
      result,
      'User 2 is not allowed to create a payment for order 123',
    );
    expect(paymentProvider.authorize).not.toHaveBeenCalled();
    expect(paymentRepository.save).not.toHaveBeenCalled();
  });

  it('returns collaborator failure as-is when payment amount is invalid', async () => {
    const dto: CreatePaymentCommand = {
      orderId: 123,
      amount: -100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.CARD,
      userId: 2,
      callerContext: customerContext,
    };

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Amount must be a non-negative integer in minor units',
      DomainError,
    );
    expect(paymentProvider.authorize).not.toHaveBeenCalled();
    expect(paymentRepository.save).not.toHaveBeenCalled();
  });

  it('returns collaborator failure as-is when authorization fails at provider', async () => {
    const dto: CreatePaymentCommand = {
      orderId: 123,
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.CARD,
      userId: 2,
      callerContext: customerContext,
    };

    const authError = new InfrastructureError('Payment network unavailable', {
      retryable: true,
    });
    paymentProvider.authorize.mockResolvedValueOnce(Result.failure(authError));

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment network unavailable',
      InfrastructureError,
    );
    expect(result.error).toBe(authError);
    expect(result.error.retryable).toBe(true);
    expect(paymentRepository.save).not.toHaveBeenCalled();
  });

  it('returns collaborator failure as-is when save fails in repository', async () => {
    const dto: CreatePaymentCommand = {
      orderId: 123,
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.CARD,
      userId: 2,
      callerContext: customerContext,
    };

    const saveError = new RepositoryError('Database save timeout', {
      retryable: true,
    });
    paymentRepository.save.mockResolvedValueOnce(Result.failure(saveError));

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Database save timeout',
      RepositoryError,
    );
    expect(result.error).toBe(saveError);
    expect(result.error.retryable).toBe(true);
  });
});
