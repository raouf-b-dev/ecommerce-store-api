import { Test, TestingModule } from '@nestjs/testing';
import { GetPaymentController } from './get-payment.controller';
import { GetPaymentUseCase } from '../../../application/usecases/get-payment/get-payment.usecase';
import { Result } from '../../../../../core/domain/result';
import { Payment } from '../../../domain/entities/payment';
import { ResultAssertionHelper } from '../../../../../testing';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentMethodType } from '../../../domain';

describe('GetPaymentController', () => {
  let controller: GetPaymentController;
  let useCase: jest.Mocked<GetPaymentUseCase>;

  beforeEach(async () => {
    const mockUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GetPaymentController],
      providers: [
        {
          provide: GetPaymentUseCase,
          useValue: mockUseCase,
        },
      ],
    }).compile();

    controller = module.get<GetPaymentController>(GetPaymentController);
    useCase = module.get(GetPaymentUseCase);
  });

  it('should get a payment successfully', async () => {
    const payment = Payment.create(
      1,
      1,
      100,
      'USD',
      PaymentMethodType.CREDIT_CARD,
      1,
    );

    useCase.execute.mockResolvedValue(Result.success(payment.toPrimitives()));

    const result = await controller.handle(1);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.id).toBe(1);
    expect(useCase.execute).toHaveBeenCalledWith(1);
  });

  it('should return Failure(ControllerError) if use case fails', async () => {
    const error = ErrorFactory.UseCaseError('Get failed').error;
    useCase.execute.mockResolvedValue(Result.failure(error));

    const result = await controller.handle(1);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to get payment',
      ControllerError,
      error,
    );
    expect(useCase.execute).toHaveBeenCalledWith(1);
  });

  it('should return Failure(ControllerError) if use case throws unexpected error', async () => {
    const error = new Error('Unexpected error');
    useCase.execute.mockRejectedValue(error);

    const result = await controller.handle(1);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected Controller Error',
      ControllerError,
      error,
    );
    expect(useCase.execute).toHaveBeenCalledWith(1);
  });
});
