import { Test, TestingModule } from '@nestjs/testing';
import { ProcessRefundUseCase } from './process-refund.usecase';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { MockPaymentRepository } from '../../../testing/mocks/payment-repository.mock';
import { PaymentEntityTestFactory } from '../../../testing/factories/payment-entity.test.factory';
import { ProcessRefundDto } from '../../../presentation/dto/process-refund.dto';
import { ResultAssertionHelper } from '../../../../../testing';
import { PaymentMapper } from '../../../infrastructure/persistence/mappers/payment.mapper';
import { Result } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';

describe('ProcessRefundUseCase', () => {
  let useCase: ProcessRefundUseCase;
  let paymentRepository: MockPaymentRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessRefundUseCase,
        {
          provide: PaymentRepository,
          useClass: MockPaymentRepository,
        },
      ],
    }).compile();

    useCase = module.get<ProcessRefundUseCase>(ProcessRefundUseCase);
    paymentRepository = module.get<PaymentRepository>(
      PaymentRepository,
    ) as unknown as MockPaymentRepository;
  });

  afterEach(() => {
    paymentRepository.reset();
  });

  it('should process a refund successfully', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 'PA123',
      amount: 100,
      refundedAmount: 0,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());
    // Use mockImplementation to return the updated payment passed to the method
    paymentRepository.update.mockImplementation(async (p) => Result.success(p));

    const dto: ProcessRefundDto = {
      amount: 50,
      reason: 'Defective product',
    };

    const result = await useCase.execute({ id: 'PA123', dto });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(paymentRepository.findById).toHaveBeenCalledWith('PA123');
    expect(paymentRepository.update).toHaveBeenCalled();
    const updatedPayment = result.value;
    expect(updatedPayment.refundedAmount).toBe(50);
  });

  it('should fail if payment is not found', async () => {
    paymentRepository.mockPaymentNotFound('PA123');

    const dto: ProcessRefundDto = {
      amount: 50,
    };

    const result = await useCase.execute({ id: 'PA123', dto });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment with id PA123 not found',
    );
    expect(paymentRepository.findById).toHaveBeenCalledWith('PA123');
    expect(paymentRepository.update).not.toHaveBeenCalled();
  });

  it('should fail if refund amount exceeds payment amount', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 'PA123',
      amount: 100,
      refundedAmount: 0,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());

    const dto: ProcessRefundDto = {
      amount: 150,
    };

    const result = await useCase.execute({ id: 'PA123', dto });

    ResultAssertionHelper.assertResultFailure(result);
    expect(paymentRepository.update).not.toHaveBeenCalled();
  });

  it('should return Failure with UseCaseError when repository throws unexpected error', async () => {
    const paymentId = 'PA123';
    const dto: ProcessRefundDto = {
      amount: 50,
    };
    const repoError = new Error('Database connection failed');

    paymentRepository.findById.mockRejectedValue(repoError);

    const result = await useCase.execute({ id: paymentId, dto });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected error processing refund',
      UseCaseError,
      repoError,
    );
    expect(paymentRepository.findById).toHaveBeenCalledWith(paymentId);
  });
});
