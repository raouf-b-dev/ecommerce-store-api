import {
  MockPaymentProvider,
  MockPaymentProviderResolver,
  MockPaymentRepository,
  PaymentEntityTestFactory,
} from 'src/modules/payments/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { CreatePaymentUseCase } from './create-payment.usecase';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { CreatePaymentCommand } from '../../commands/create-payment.command';
import { PaymentMethodType } from '../../../../../../shared-kernel/domain/value-objects/payment-method';
import { ResultAssertionHelper } from '../../../../../../testing';
import { PaymentMapper } from '../../../../secondary-adapters/persistence/mappers/payment.mapper';
import { PaymentProviderResolver } from '../../ports/payment-provider-resolver';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { createUserCallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';

describe('CreatePaymentUseCase', () => {
  let useCase: CreatePaymentUseCase;
  let paymentRepository: MockPaymentRepository;
  let providerResolver: MockPaymentProviderResolver;
  let defaultProvider: MockPaymentProvider;

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
    providerResolver = new MockPaymentProviderResolver();
    defaultProvider = providerResolver.getDefaultProvider();
    defaultProvider.mockSuccessfulAuthorize('txn_123');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePaymentUseCase,
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

    useCase = module.get<CreatePaymentUseCase>(CreatePaymentUseCase);
    paymentRepository = module.get<MockPaymentRepository>(PaymentRepository);
  });

  afterEach(() => {
    paymentRepository.reset();
    providerResolver.reset();
  });

  it('should create a payment successfully', async () => {
    const dto: CreatePaymentCommand = {
      orderId: 123,
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.STRIPE,
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

  it('fails when user is not authorized to create payment for order', async () => {
    const dto: CreatePaymentCommand = {
      orderId: 123,
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.STRIPE,
      userId: 2,
      callerContext: otherCustomerContext,
    };

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultFailure(
      result,
      'User 2 is not allowed to create a payment for order 123',
    );
    expect(defaultProvider.authorize).not.toHaveBeenCalled();
    expect(paymentRepository.save).not.toHaveBeenCalled();
  });

  it('fails when payment amount is invalid', async () => {
    const dto: CreatePaymentCommand = {
      orderId: 123,
      amount: -100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.STRIPE,
      userId: 2,
      callerContext: customerContext,
    };

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Invalid payment amount: Amount must be a non-negative integer in minor units',
    );
    expect(defaultProvider.authorize).not.toHaveBeenCalled();
    expect(paymentRepository.save).not.toHaveBeenCalled();
  });

  it('fails when authorization fails at provider', async () => {
    const dto: CreatePaymentCommand = {
      orderId: 123,
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.STRIPE,
      userId: 2,
      callerContext: customerContext,
    };

    defaultProvider.authorize.mockResolvedValueOnce(
      ErrorFactory.InfrastructureError('Insufficient funds'),
    );

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment authorization failed: Insufficient funds',
    );
    expect(paymentRepository.save).not.toHaveBeenCalled();
  });

  it('should fail if save fails', async () => {
    const dto: CreatePaymentCommand = {
      orderId: 123,
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.STRIPE,
      userId: 2,
      callerContext: customerContext,
    };

    paymentRepository.mockSaveFailure('Save failed');

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Save failed',
      RepositoryError,
    );
  });
});
