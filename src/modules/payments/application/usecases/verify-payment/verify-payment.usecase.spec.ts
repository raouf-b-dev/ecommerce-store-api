import { Test, TestingModule } from '@nestjs/testing';
import { VerifyPaymentUseCase } from './verify-payment.usecase';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { MockPaymentRepository } from '../../../testing/mocks/payment-repository.mock';
import { PaymentEntityTestFactory } from '../../../testing/factories/payment-entity.test.factory';
import { ResultAssertionHelper } from '../../../../../testing';
import { PaymentMapper } from '../../../infrastructure/persistence/mappers/payment.mapper';
import { UseCaseError } from '../../../../../core/errors/usecase.error';

describe('VerifyPaymentUseCase', () => {
  let useCase: VerifyPaymentUseCase;
  let paymentRepository: MockPaymentRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyPaymentUseCase,
        {
          provide: PaymentRepository,
          useClass: MockPaymentRepository,
        },
      ],
    }).compile();

    useCase = module.get<VerifyPaymentUseCase>(VerifyPaymentUseCase);
    paymentRepository = module.get<PaymentRepository>(
      PaymentRepository,
    ) as unknown as MockPaymentRepository;
  });

  afterEach(() => {
    paymentRepository.reset();
  });

  it('should verify a payment successfully', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 'PA123',
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());

    const result = await useCase.execute('PA123');

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.id).toBe('PA123');
    expect(paymentRepository.findById).toHaveBeenCalledWith('PA123');
  });

  it('should fail if payment is not found', async () => {
    paymentRepository.mockPaymentNotFound('PA123');

    const result = await useCase.execute('PA123');

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment with id PA123 not found',
    );
    expect(paymentRepository.findById).toHaveBeenCalledWith('PA123');
  });

  it('should return Failure with UseCaseError when repository throws unexpected error', async () => {
    const paymentId = 'PA123';
    const repoError = new Error('Database connection failed');

    paymentRepository.findById.mockRejectedValue(repoError);

    const result = await useCase.execute(paymentId);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected error verifying payment',
      UseCaseError,
      repoError,
    );
    expect(paymentRepository.findById).toHaveBeenCalledWith(paymentId);
  });
});
