import { Test, TestingModule } from '@nestjs/testing';
import { CapturePaymentController } from './capture-payment.controller';
import { CapturePaymentUseCase } from '../../../application/usecases/capture-payment/capture-payment.usecase';
import { Result } from '../../../../../core/domain/result';
import { Payment } from '../../../domain/entities/payment';
import { ResultAssertionHelper } from '../../../../../testing';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentMethodType } from '../../../domain';

describe('CapturePaymentController', () => {
  let controller: CapturePaymentController;
  let useCase: jest.Mocked<CapturePaymentUseCase>;

  beforeEach(async () => {
    const mockUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CapturePaymentController],
      providers: [
        {
          provide: CapturePaymentUseCase,
          useValue: mockUseCase,
        },
      ],
    }).compile();

    controller = module.get<CapturePaymentController>(CapturePaymentController);
    useCase = module.get(CapturePaymentUseCase);
  });

  it('should capture a payment successfully', async () => {
    const payment = Payment.create(
      'pay-1',
      'order-1',
      100,
      'USD',
      PaymentMethodType.CREDIT_CARD,
      'cust-1',
    );

    useCase.execute.mockResolvedValue(Result.success(payment.toPrimitives()));

    const result = await controller.handle('pay-1');

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.id).toBe('pay-1');
    expect(useCase.execute).toHaveBeenCalledWith('pay-1');
  });

  it('should return Failure(ControllerError) if use case fails', async () => {
    const error = ErrorFactory.UseCaseError('Capture failed').error;
    useCase.execute.mockResolvedValue(Result.failure(error));

    const result = await controller.handle('pay-1');

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to capture payment',
      ControllerError,
      error,
    );
    expect(useCase.execute).toHaveBeenCalledWith('pay-1');
  });

  it('should return Failure(ControllerError) if use case throws unexpected error', async () => {
    const error = new Error('Unexpected error');
    useCase.execute.mockRejectedValue(error);

    const result = await controller.handle('pay-1');

    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected Controller Error',
      ControllerError,
      error,
    );
    expect(useCase.execute).toHaveBeenCalledWith('pay-1');
  });
});
