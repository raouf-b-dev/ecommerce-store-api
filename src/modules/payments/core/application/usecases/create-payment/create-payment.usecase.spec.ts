import { Test, TestingModule } from '@nestjs/testing';
import { CreatePaymentUseCase } from './create-payment.usecase';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { MockPaymentRepository } from '../../../../testing/mocks/payment-repository.mock';
import { CreatePaymentCommand } from '../../commands/create-payment.command';
import { PaymentMethodType } from '../../../../../../shared-kernel/domain/value-objects/payment-method';
import { ResultAssertionHelper } from '../../../../../../testing';
import { PaymentEntityTestFactory } from '../../../../testing/factories/payment-entity.test.factory';
import { PaymentMapper } from '../../../../secondary-adapters/persistence/mappers/payment.mapper';
import { PaymentGatewayResolver } from '../../ports/payment-gateway-resolver';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { createUserCallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  MockPaymentGatewayResolver,
  MockPaymentGateway,
} from '../../../../testing/mocks/payment-gateway.mock';

describe('CreatePaymentUseCase', () => {
  let useCase: CreatePaymentUseCase;
  let paymentRepository: MockPaymentRepository;
  let gatewayResolver: MockPaymentGatewayResolver;
  let defaultGateway: MockPaymentGateway;

  const customerContext = createUserCallerContext({
    userId: 2,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_orders']),
  });

  beforeEach(async () => {
    gatewayResolver = new MockPaymentGatewayResolver();
    defaultGateway = gatewayResolver.getDefaultGateway();
    defaultGateway.mockSuccessfulAuthorize('txn_123');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePaymentUseCase,
        {
          provide: PaymentRepository,
          useClass: MockPaymentRepository,
        },
        {
          provide: PaymentGatewayResolver,
          useValue: gatewayResolver,
        },
      ],
    }).compile();

    useCase = module.get<CreatePaymentUseCase>(CreatePaymentUseCase);
    paymentRepository = module.get<PaymentRepository>(
      PaymentRepository,
    ) as MockPaymentRepository;
  });

  afterEach(() => {
    paymentRepository.reset();
    gatewayResolver.reset();
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
