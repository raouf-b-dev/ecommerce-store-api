import { Test, TestingModule } from '@nestjs/testing';
import { ProcessRefundUseCase } from './process-refund.usecase';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { MockPaymentRepository } from '../../../../testing/mocks/payment-repository.mock';
import { PaymentEntityTestFactory } from '../../../../testing/factories/payment-entity.test.factory';
import { ProcessRefundCommand } from './process-refund.usecase';
import { ResultAssertionHelper } from '../../../../../../testing';
import { PaymentMapper } from '../../../../secondary-adapters/persistence/mappers/payment.mapper';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { PaymentGatewayResolver } from '../../ports/payment-gateway-resolver';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';

describe('ProcessRefundUseCase', () => {
  let useCase: ProcessRefundUseCase;
  let paymentRepository: MockPaymentRepository;
  let domainEventPublisher: DomainEventPublisher;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessRefundUseCase,
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
        {
          provide: DomainEventPublisher,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get<ProcessRefundUseCase>(ProcessRefundUseCase);
    paymentRepository = module.get<PaymentRepository>(
      PaymentRepository,
    ) as MockPaymentRepository;
    domainEventPublisher = module.get(DomainEventPublisher);

    const factory = module.get(PaymentGatewayResolver);
    (factory.getGateway as jest.Mock).mockReturnValue({
      refund: jest.fn().mockResolvedValue({
        isFailure: false,
        isSuccess: true,
        value: {
          success: true,
          transactionId: 'txn_refund_123',
        },
      }),
    });
  });

  afterEach(() => {
    paymentRepository.reset();
  });

  it('should process a refund successfully', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 123,
      amount: 100,
      refundedAmount: 0,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());
    // Use mockImplementation to return the updated payment passed to the method
    paymentRepository.update.mockImplementation(async (p) => Result.success(p));

    const dto: ProcessRefundCommand = {
      amount: 50,
      reason: 'Defective product',
    };

    const result = await useCase.execute({ id: 123, dto });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(paymentRepository.findById).toHaveBeenCalledWith(123);
    expect(paymentRepository.update).toHaveBeenCalled();
    const updatedPayment = result.value;
    expect(updatedPayment.refundedAmount).toBe(50);

    expect(domainEventPublisher.publish).toHaveBeenCalledWith(
      'payment.refunded',
      {
        paymentId: 123,
        refundId: null,
      },
    );
  });

  it('should fail if payment is not found', async () => {
    paymentRepository.mockPaymentNotFound(123);

    const dto: ProcessRefundCommand = {
      amount: 50,
    };

    const result = await useCase.execute({ id: 123, dto });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment with id 123 not found',
    );
    expect(paymentRepository.findById).toHaveBeenCalledWith(123);
    expect(paymentRepository.update).not.toHaveBeenCalled();
  });

  it('should fail if refund amount exceeds payment amount', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 123,
      amount: 100,
      refundedAmount: 0,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());

    const dto: ProcessRefundCommand = {
      amount: 150,
    };

    const result = await useCase.execute({ id: 123, dto });

    ResultAssertionHelper.assertResultFailure(result);
    expect(paymentRepository.update).not.toHaveBeenCalled();
  });
});
