import { Test, TestingModule } from '@nestjs/testing';
import { RecordCodPaymentController } from './record-cod-payment.controller';
import { RecordCodPaymentUseCase } from '../../../application/usecases/record-cod-payment/record-cod-payment.usecase';
import { RecordCodPaymentDto } from '../../dto/record-cod-payment.dto';
import { Result } from '../../../../../core/domain/result';
import { Payment } from '../../../domain/entities/payment';
import { ResultAssertionHelper } from '../../../../../testing';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

describe('RecordCodPaymentController', () => {
  let controller: RecordCodPaymentController;
  let useCase: jest.Mocked<RecordCodPaymentUseCase>;

  beforeEach(async () => {
    const mockUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecordCodPaymentController],
      providers: [
        {
          provide: RecordCodPaymentUseCase,
          useValue: mockUseCase,
        },
      ],
    }).compile();

    controller = module.get<RecordCodPaymentController>(
      RecordCodPaymentController,
    );
    useCase = module.get(RecordCodPaymentUseCase);
  });

  it('should record a COD payment successfully', async () => {
    const dto: RecordCodPaymentDto = {
      orderId: 'order-1',
      amountCollected: 100,
      currency: 'USD',
    };

    const payment = Payment.createCOD(
      'pay-1',
      dto.orderId,
      dto.amountCollected,
      dto.currency,
    );

    useCase.execute.mockResolvedValue(Result.success(payment.toPrimitives()));

    const result = await controller.handle(dto);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.id).toBe('pay-1');
    expect(useCase.execute).toHaveBeenCalledWith(dto);
  });

  it('should return Failure(ControllerError) if use case fails', async () => {
    const dto: RecordCodPaymentDto = {
      orderId: 'order-1',
      amountCollected: 100,
      currency: 'USD',
    };
    const error = ErrorFactory.UseCaseError('Record failed').error;
    useCase.execute.mockResolvedValue(Result.failure(error));

    const result = await controller.handle(dto);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to record COD payment',
      ControllerError,
      error,
    );
    expect(useCase.execute).toHaveBeenCalledWith(dto);
  });

  it('should return Failure(ControllerError) if use case throws unexpected error', async () => {
    const dto: RecordCodPaymentDto = {
      orderId: 'order-1',
      amountCollected: 100,
      currency: 'USD',
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
