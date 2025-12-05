import { Test, TestingModule } from '@nestjs/testing';
import { CreatePaymentController } from './create-payment.controller';
import { CreatePaymentUseCase } from '../../../application/usecases/create-payment/create-payment.usecase';
import { CreatePaymentDto } from '../../dto/create-payment.dto';
import { Result } from '../../../../../core/domain/result';
import { Payment } from '../../../domain/entities/payment';
import { PaymentMethodType } from '../../../domain/value-objects/payment-method';
import { ResultAssertionHelper } from '../../../../../testing';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

describe('CreatePaymentController', () => {
  let controller: CreatePaymentController;
  let useCase: jest.Mocked<CreatePaymentUseCase>;

  beforeEach(async () => {
    const mockUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreatePaymentController],
      providers: [
        {
          provide: CreatePaymentUseCase,
          useValue: mockUseCase,
        },
      ],
    }).compile();

    controller = module.get<CreatePaymentController>(CreatePaymentController);
    useCase = module.get(CreatePaymentUseCase);
  });

  it('should create a payment successfully', async () => {
    const dto: CreatePaymentDto = {
      orderId: 'order-1',
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      customerId: 'cust-1',
    };

    const payment = Payment.create(
      'pay-1',
      dto.orderId,
      dto.amount,
      dto.currency,
      dto.paymentMethod,
      dto.customerId,
    );

    useCase.execute.mockResolvedValue(Result.success(payment.toPrimitives()));

    const result = await controller.handle(dto);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.id).toBe('pay-1');
    expect(useCase.execute).toHaveBeenCalledWith(dto);
  });

  it('should return Failure(ControllerError) if use case fails', async () => {
    const dto: CreatePaymentDto = {
      orderId: 'order-1',
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      customerId: 'cust-1',
    };
    const error = ErrorFactory.UseCaseError('Creation failed').error;
    useCase.execute.mockResolvedValue(Result.failure(error));

    const result = await controller.handle(dto);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to create payment',
      ControllerError,
      error,
    );
    expect(useCase.execute).toHaveBeenCalledWith(dto);
  });

  it('should return Failure(ControllerError) if use case throws unexpected error', async () => {
    const dto: CreatePaymentDto = {
      orderId: 'order-1',
      amount: 100,
      currency: 'USD',
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      customerId: 'cust-1',
    };
    const error = new Error('Unexpected error');
    useCase.execute.mockRejectedValue(error);

    const result = await controller.handle(dto);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected Controller Error',
      ControllerError,
      error,
    );
    expect(useCase.execute).toHaveBeenCalledWith(dto);
  });
});
