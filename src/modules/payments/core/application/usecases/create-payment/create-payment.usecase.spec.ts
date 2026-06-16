import { Test, TestingModule } from '@nestjs/testing';
import { CreatePaymentUseCase } from './create-payment.usecase';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { MockPaymentRepository } from '../../../../testing/mocks/payment-repository.mock';
import { CreatePaymentCommand } from './create-payment.usecase';
import { PaymentMethodType } from '../../../../../../shared-kernel/domain/value-objects/payment-method';
import { ResultAssertionHelper } from '../../../../../../testing';
import { PaymentEntityTestFactory } from '../../../../testing/factories/payment-entity.test.factory';
import { PaymentMapper } from '../../../../secondary-adapters/persistence/mappers/payment.mapper';
import { PaymentGatewayResolver } from '../../ports/payment-gateway-resolver';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { createUserCallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('CreatePaymentUseCase', () => {
  let useCase: CreatePaymentUseCase;
  let paymentRepository: MockPaymentRepository;

  const customerContext = createUserCallerContext({
    userId: 2,
    customerId: 123,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_orders']),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePaymentUseCase,
        {
          provide: PaymentRepository,
          useClass: MockPaymentRepository,
        },
        {
          provide: PaymentGatewayResolver,
          useValue: {
            getGateway: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<CreatePaymentUseCase>(CreatePaymentUseCase);
    paymentRepository = module.get<PaymentRepository>(
      PaymentRepository,
    ) as MockPaymentRepository;

    const factory = module.get(PaymentGatewayResolver);
    (factory.getGateway as jest.Mock).mockReturnValue({
      authorize: jest.fn().mockResolvedValue({
        isFailure: false,
        isSuccess: true,
        value: {
          success: true,
          transactionId: 'txn_123',
          status: 'AUTHORIZED',
        },
      }),
    });
  });

  afterEach(() => {
    paymentRepository.reset();
  });

  it('should create a payment successfully', async () => {
    const dto: CreatePaymentCommand = {
      orderId: 123,
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      customerId: 123,
      paymentMethodDetails: { cardLast4: '4242' },
    };

    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      orderId: dto.orderId,
      amount: dto.amount,
      currency: dto.currency,
      paymentMethod: dto.paymentMethod,
      customerId: dto.customerId,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulSave(payment);

    const result = await useCase.execute({
      command: dto,
      callerContext: customerContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(paymentRepository.save).toHaveBeenCalled();
    expect(result.value.orderId).toBe(dto.orderId);
  });

  it('should fail if save fails', async () => {
    const dto: CreatePaymentCommand = {
      orderId: 123,
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      customerId: 123,
    };

    paymentRepository.mockSaveFailure('Save failed');

    const result = await useCase.execute({
      command: dto,
      callerContext: customerContext,
    });

    ResultAssertionHelper.assertResultFailure(result, 'Save failed');
  });
});
