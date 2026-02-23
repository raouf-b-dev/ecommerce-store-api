import { Test, TestingModule } from '@nestjs/testing';
import { CapturePaymentUseCase } from './capture-payment.usecase';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { MockPaymentRepository } from '../../../../testing/mocks/payment-repository.mock';
import { PaymentEntityTestFactory } from '../../../../testing/factories/payment-entity.test.factory';
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
import { ResultAssertionHelper } from '../../../../../../testing';
import { PaymentMapper } from '../../../../secondary-adapters/persistence/mappers/payment.mapper';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/errors/usecase.error';

describe('CapturePaymentUseCase', () => {
  let useCase: CapturePaymentUseCase;
  let paymentRepository: MockPaymentRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapturePaymentUseCase,
        {
          provide: PaymentRepository,
          useClass: MockPaymentRepository,
        },
      ],
    }).compile();

    useCase = module.get<CapturePaymentUseCase>(CapturePaymentUseCase);
    paymentRepository = module.get<PaymentRepository>(
      PaymentRepository,
    ) as unknown as MockPaymentRepository;
  });

  afterEach(() => {
    paymentRepository.reset();
  });

  it('should capture a payment successfully', async () => {
    // Create an AUTHORIZED payment since capture() requires authorized status
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 123,
      amount: 100,
      status: PaymentStatusType.AUTHORIZED,
      completedAt: null,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());
    // The use case calls payment.capture() which mutates the payment, then passes it to update()
    // So the mock should return the same payment instance that was passed to it (after mutation)
    paymentRepository.update.mockImplementation(async (p) => Result.success(p));

    const result = await useCase.execute(123);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(paymentRepository.findById).toHaveBeenCalledWith(123);
    expect(paymentRepository.update).toHaveBeenCalled();
    const updatedPayment = result.value;
    expect(updatedPayment.status).toBe(PaymentStatusType.CAPTURED);
  });

  it('should fail if payment is not found', async () => {
    paymentRepository.mockPaymentNotFound(123);

    const result = await useCase.execute(123);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment with id 123 not found',
    );
    expect(paymentRepository.findById).toHaveBeenCalledWith(123);
    expect(paymentRepository.update).not.toHaveBeenCalled();
  });

  it('should fail if update fails', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPendingEntity({
      id: 123,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());

    // Manually mock update failure as mockSaveFailure mocks 'save'
    paymentRepository.update.mockResolvedValue({
      isFailure: true,
      isSuccess: false,
      error: new Error('Update failed'),
    } as any);

    const result = await useCase.execute(123);

    ResultAssertionHelper.assertResultFailure(result, 'Update failed');
  });

  it('should return Failure with UseCaseError when repository throws unexpected error', async () => {
    const paymentId = 123;
    const repoError = new Error('Database connection failed');

    paymentRepository.findById.mockRejectedValue(repoError);

    const result = await useCase.execute(paymentId);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected error capturing payment',
      UseCaseError,
      repoError,
    );
    expect(paymentRepository.findById).toHaveBeenCalledWith(paymentId);
  });
});
