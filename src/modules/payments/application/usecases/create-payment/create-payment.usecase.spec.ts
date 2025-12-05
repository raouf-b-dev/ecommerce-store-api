import { Test, TestingModule } from '@nestjs/testing';
import { CreatePaymentUseCase } from './create-payment.usecase';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { MockPaymentRepository } from '../../../testing/mocks/payment-repository.mock';
import { CreatePaymentDto } from '../../../presentation/dto/create-payment.dto';
import { PaymentMethodType } from '../../../domain/value-objects/payment-method';
import { ResultAssertionHelper } from '../../../../../testing';
import { PaymentEntityTestFactory } from '../../../testing/factories/payment-entity.test.factory';
import { PaymentMapper } from '../../../infrastructure/persistence/mappers/payment.mapper';
import { UseCaseError } from '../../../../../core/errors/usecase.error';

describe('CreatePaymentUseCase', () => {
  let useCase: CreatePaymentUseCase;
  let paymentRepository: MockPaymentRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePaymentUseCase,
        {
          provide: PaymentRepository,
          useClass: MockPaymentRepository,
        },
      ],
    }).compile();

    useCase = module.get<CreatePaymentUseCase>(CreatePaymentUseCase);
    paymentRepository = module.get<PaymentRepository>(
      PaymentRepository,
    ) as unknown as MockPaymentRepository;
  });

  afterEach(() => {
    paymentRepository.reset();
  });

  it('should create a payment successfully', async () => {
    const dto: CreatePaymentDto = {
      orderId: 'OR123',
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      customerId: 'CU123',
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

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(paymentRepository.save).toHaveBeenCalled();
    const createdPayment = result.value;
    expect(createdPayment.orderId).toBe(dto.orderId);
    expect(createdPayment.amount).toBe(dto.amount);
  });

  it('should fail if save fails', async () => {
    const dto: CreatePaymentDto = {
      orderId: 'OR123',
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      customerId: 'CU123',
    };

    paymentRepository.mockSaveFailure('Save failed');

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultFailure(result, 'Save failed');
    expect(paymentRepository.save).toHaveBeenCalled();
  });

  it('should return Failure with UseCaseError when repository throws unexpected error', async () => {
    const dto: CreatePaymentDto = {
      orderId: 'OR123',
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      customerId: 'CU123',
    };
    const repoError = new Error('Database connection failed');

    paymentRepository.save.mockRejectedValue(repoError);

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected error creating payment',
      UseCaseError,
      repoError,
    );
    expect(paymentRepository.save).toHaveBeenCalled();
  });
});
