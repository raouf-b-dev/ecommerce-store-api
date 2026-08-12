import {
  MockPaymentGateway,
  MockPaymentGatewayResolver,
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
import { PaymentGatewayResolver } from '../../ports/payment-gateway-resolver';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';

describe('ProcessRefundUseCase', () => {
  let useCase: ProcessRefundUseCase;
  let paymentRepository: MockPaymentRepository;
  let gatewayResolver: MockPaymentGatewayResolver;
  let defaultGateway: MockPaymentGateway;

  beforeEach(async () => {
    gatewayResolver = new MockPaymentGatewayResolver();
    defaultGateway = gatewayResolver.getDefaultGateway();
    defaultGateway.mockSuccessfulRefund('txn_refund_123');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessRefundUseCase,
        {
          provide: PaymentRepository,
          useClass: MockPaymentRepository,
        },
        {
          provide: PaymentGatewayResolver,
          useValue: gatewayResolver,
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
  });

  afterEach(() => {
    paymentRepository.reset();
    gatewayResolver.reset();
  });

  it('should process a refund successfully', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 123,
      amount: 100,
      refundedAmount: 0,
      transactionId: 'txn_123',
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());
    paymentRepository.update.mockImplementation(async (p) => Result.success(p));

    const command: ProcessRefundCommand = {
      paymentId: 123,
      amount: 50,
      reason: 'Defective product',
    };

    const result = await useCase.execute(command);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(paymentRepository.findById).toHaveBeenCalledWith(123);
    const updatedPayment = result.value;
    expect(updatedPayment.refundedAmount).toBe(50);
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

    ResultAssertionHelper.assertResultFailure(result);
  });
});
