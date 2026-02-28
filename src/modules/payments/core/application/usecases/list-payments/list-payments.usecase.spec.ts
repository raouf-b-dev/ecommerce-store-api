import { Test, TestingModule } from '@nestjs/testing';
import { ListPaymentsUseCase } from './list-payments.usecase';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { MockPaymentRepository } from '../../../../testing/mocks/payment-repository.mock';
import { PaymentEntityTestFactory } from '../../../../testing/factories/payment-entity.test.factory';
import { ResultAssertionHelper } from '../../../../../../testing';
import { PaymentMapper } from '../../../../secondary-adapters/persistence/mappers/payment.mapper';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';

describe('ListPaymentsUseCase', () => {
  let useCase: ListPaymentsUseCase;
  let paymentRepository: MockPaymentRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListPaymentsUseCase,
        {
          provide: PaymentRepository,
          useClass: MockPaymentRepository,
        },
      ],
    }).compile();

    useCase = module.get<ListPaymentsUseCase>(ListPaymentsUseCase);
    paymentRepository = module.get<PaymentRepository>(
      PaymentRepository,
    ) as unknown as MockPaymentRepository;
  });

  afterEach(() => {
    paymentRepository.reset();
  });

  it('should list payments by orderId', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      orderId: 123,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindByOrderId([payment.toPrimitives()]);

    const result = await useCase.execute({ orderId: 123 });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toHaveLength(1);
    expect(result.value[0].orderId).toBe(123);
    expect(paymentRepository.findByOrderId).toHaveBeenCalledWith(123);
  });

  it('should list payments by customerId', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      customerId: 123,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    // Mocking findByCustomerId manually
    (paymentRepository.findByCustomerId as jest.Mock).mockResolvedValue(
      Result.success([payment]),
    );

    const result = await useCase.execute({ customerId: 123 });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toHaveLength(1);
    expect(paymentRepository.findByCustomerId).toHaveBeenCalledWith(
      123,
      undefined,
      undefined,
    );
  });

  it('should return empty list if no filters provided (default behavior)', async () => {
    const result = await useCase.execute({});

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual([]);
  });

  it('should return Failure with UseCaseError when repository throws unexpected error', async () => {
    const repoError = new Error('Database connection failed');

    paymentRepository.findByOrderId.mockRejectedValue(repoError);

    const result = await useCase.execute({ orderId: 123 });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected error listing payments',
      UseCaseError,
      repoError,
    );
    expect(paymentRepository.findByOrderId).toHaveBeenCalledWith(123);
  });
});
