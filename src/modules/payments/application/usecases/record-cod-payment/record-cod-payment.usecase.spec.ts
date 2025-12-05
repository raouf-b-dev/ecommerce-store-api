import { Test, TestingModule } from '@nestjs/testing';
import { RecordCodPaymentUseCase } from './record-cod-payment.usecase';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { MockPaymentRepository } from '../../../testing/mocks/payment-repository.mock';
import { RecordCodPaymentDto } from '../../../presentation/dto/record-cod-payment.dto';
import { PaymentMethodType } from '../../../domain/value-objects/payment-method';
import { ResultAssertionHelper } from '../../../../../testing';
import { PaymentMapper } from '../../../infrastructure/persistence/mappers/payment.mapper';
import { PaymentEntityTestFactory } from '../../../testing/factories/payment-entity.test.factory';
import { UseCaseError } from '../../../../../core/errors/usecase.error';

describe('RecordCodPaymentUseCase', () => {
  let useCase: RecordCodPaymentUseCase;
  let paymentRepository: MockPaymentRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordCodPaymentUseCase,
        {
          provide: PaymentRepository,
          useClass: MockPaymentRepository,
        },
      ],
    }).compile();

    useCase = module.get<RecordCodPaymentUseCase>(RecordCodPaymentUseCase);
    paymentRepository = module.get<PaymentRepository>(
      PaymentRepository,
    ) as unknown as MockPaymentRepository;
  });

  afterEach(() => {
    paymentRepository.reset();
  });

  it('should record a COD payment successfully', async () => {
    const dto: RecordCodPaymentDto = {
      orderId: 'OR123',
      amountCollected: 100,
      currency: 'USD',
    };

    const paymentEntity = PaymentEntityTestFactory.createCODEntity({
      orderId: dto.orderId,
      amount: dto.amountCollected,
      currency: dto.currency,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulSave(payment);

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(paymentRepository.save).toHaveBeenCalled();
    const createdPayment = result.value;
    expect(createdPayment.orderId).toBe(dto.orderId);
    expect(createdPayment.amount).toBe(dto.amountCollected);
    expect(createdPayment.paymentMethod).toBe(
      PaymentMethodType.CASH_ON_DELIVERY,
    );
  });

  it('should fail if save fails', async () => {
    const dto: RecordCodPaymentDto = {
      orderId: 'OR123',
      amountCollected: 100,
      currency: 'USD',
    };

    paymentRepository.mockSaveFailure('Save failed');

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultFailure(result, 'Save failed');
    expect(paymentRepository.save).toHaveBeenCalled();
  });

  it('should return Failure with UseCaseError when repository throws unexpected error', async () => {
    const dto: RecordCodPaymentDto = {
      orderId: 'OR123',
      amountCollected: 100,
      currency: 'USD',
    };
    const repoError = new Error('Database connection failed');

    paymentRepository.save.mockRejectedValue(repoError);

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected error recording COD payment',
      UseCaseError,
      repoError,
    );
    expect(paymentRepository.save).toHaveBeenCalled();
  });
});
