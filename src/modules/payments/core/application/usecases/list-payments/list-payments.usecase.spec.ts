import { Test, TestingModule } from '@nestjs/testing';
import { ListPaymentsUseCase } from './list-payments.usecase';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { MockPaymentRepository } from '../../../../testing/mocks/payment-repository.mock';
import { PaymentEntityTestFactory } from '../../../../testing/factories/payment-entity.test.factory';
import { ResultAssertionHelper } from '../../../../../../testing';
import { PaymentMapper } from '../../../../secondary-adapters/persistence/mappers/payment.mapper';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { OrderGateway } from '../../ports/order.gateway';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';

describe('ListPaymentsUseCase', () => {
  let useCase: ListPaymentsUseCase;
  let paymentRepository: MockPaymentRepository;
  let orderGateway: jest.Mocked<OrderGateway>;

  const adminContext: CallerContext = {
    kind: 'user',
    userId: 1,
    customerId: null,
    role: 'ADMIN',
    permissions: new Set(['view_all_payments', 'view_all_orders']),
  };

  const customerContext: CallerContext = {
    kind: 'user',
    userId: 2,
    customerId: 123,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_payments', 'view_own_orders']),
  };

  beforeEach(async () => {
    orderGateway = {
      getOrderCustomerId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListPaymentsUseCase,
        {
          provide: PaymentRepository,
          useClass: MockPaymentRepository,
        },
        {
          provide: OrderGateway,
          useValue: orderGateway,
        },
      ],
    }).compile();

    useCase = module.get<ListPaymentsUseCase>(ListPaymentsUseCase);
    paymentRepository = module.get<PaymentRepository>(
      PaymentRepository,
    ) as MockPaymentRepository;
  });

  afterEach(() => {
    paymentRepository.reset();
  });

  it('should list payments by orderId for admin', async () => {
    orderGateway.getOrderCustomerId.mockResolvedValue(Result.success(456));

    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      orderId: 123,
      customerId: 456,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindByOrderId([payment.toPrimitives()]);

    const result = await useCase.execute({
      query: { orderId: 123 },
      callerContext: adminContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toHaveLength(1);
  });

  it('should list payments by orderId for customer who owns the order', async () => {
    orderGateway.getOrderCustomerId.mockResolvedValue(Result.success(123));

    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      orderId: 123,
      customerId: 123,
    });

    paymentRepository.mockSuccessfulFindByOrderId([
      PaymentMapper.toDomain(paymentEntity).toPrimitives(),
    ]);

    const result = await useCase.execute({
      query: { orderId: 123 },
      callerContext: customerContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toHaveLength(1);
  });

  it('should return not found when customer queries another customers order payments', async () => {
    orderGateway.getOrderCustomerId.mockResolvedValue(Result.success(456));

    const result = await useCase.execute({
      query: { orderId: 123 },
      callerContext: customerContext,
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Order with id 123 not found',
      UseCaseError,
    );
  });

  it('should force customerId when listing by customerId for customer', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      customerId: 123,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    (paymentRepository.findByCustomerId as jest.Mock).mockResolvedValue(
      Result.success([payment]),
    );

    const result = await useCase.execute({
      query: { customerId: 999 },
      callerContext: customerContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(paymentRepository.findByCustomerId).toHaveBeenCalledWith(
      123,
      undefined,
      undefined,
    );
  });
});
