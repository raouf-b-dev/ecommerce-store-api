import { Test, TestingModule } from '@nestjs/testing';
import { VerifyPaymentUseCase } from './verify-payment.usecase';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { ResultAssertionHelper } from '../../../../../../testing';
import { PaymentMapper } from '../../../../secondary-adapters/persistence/mappers/payment.mapper';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { createUserCallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  MockPaymentRepository,
  PaymentEntityTestFactory,
} from 'src/modules/payments/testing';

describe('VerifyPaymentUseCase', () => {
  let useCase: VerifyPaymentUseCase;
  let paymentRepository: MockPaymentRepository;

  const adminContext = createUserCallerContext({
    userId: 1,
    role: 'ADMIN',
    permissions: new Set(['view_all_payments']),
  });

  const customerContext = createUserCallerContext({
    userId: 2,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_payments']),
  });

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
    ) as MockPaymentRepository;
  });

  afterEach(() => {
    paymentRepository.reset();
  });

  it('should verify a payment successfully if found and caller is admin', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 123,
      userId: 456,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());

    const result = await useCase.execute({
      paymentId: 123,
      callerContext: adminContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.id).toBe(123);
    expect(paymentRepository.findById).toHaveBeenCalledWith(123);
  });

  it('should verify a payment successfully if found and caller is the owner', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 123,
      userId: 2,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());

    const result = await useCase.execute({
      paymentId: 123,
      callerContext: customerContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.id).toBe(123);
  });

  it('should return 404 if payment userId does not match caller userId', async () => {
    const paymentEntity = PaymentEntityTestFactory.createPaymentEntity({
      id: 123,
      userId: 456,
    });
    const payment = PaymentMapper.toDomain(paymentEntity);

    paymentRepository.mockSuccessfulFindById(payment.toPrimitives());

    const result = await useCase.execute({
      paymentId: 123,
      callerContext: customerContext,
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment with id 123 not found',
      UseCaseError,
    );
  });

  it('should fail if payment is not found', async () => {
    paymentRepository.mockPaymentNotFound(123);

    const result = await useCase.execute({
      paymentId: 123,
      callerContext: adminContext,
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment with id 123 not found',
    );
    expect(paymentRepository.findById).toHaveBeenCalledWith(123);
  });
});
