import { Test, TestingModule } from '@nestjs/testing';
import { ProcessRefundController } from './process-refund.controller';
import { ProcessRefundUseCase } from '../../../application/usecases/process-refund/process-refund.usecase';
import { ProcessRefundDto } from '../../dto/process-refund.dto';
import { Result } from '../../../../../core/domain/result';
import { Payment } from '../../../domain/entities/payment';
import { ResultAssertionHelper } from '../../../../../testing';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentMethodType } from '../../../domain';

describe('ProcessRefundController', () => {
  let controller: ProcessRefundController;
  let useCase: jest.Mocked<ProcessRefundUseCase>;

  beforeEach(async () => {
    const mockUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessRefundController],
      providers: [
        {
          provide: ProcessRefundUseCase,
          useValue: mockUseCase,
        },
      ],
    }).compile();

    controller = module.get<ProcessRefundController>(ProcessRefundController);
    useCase = module.get(ProcessRefundUseCase);
  });

  it('should process a refund successfully', async () => {
    const dto: ProcessRefundDto = {
      amount: 50,
      reason: 'Defective product',
    };

    const payment = Payment.create(
      'pay-1',
      'order-1',
      100,
      'USD',
      PaymentMethodType.CREDIT_CARD,
      'cust-1',
    );

    useCase.execute.mockResolvedValue(Result.success(payment.toPrimitives()));

    const result = await controller.handle('pay-1', dto);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.id).toBe('pay-1');
    expect(useCase.execute).toHaveBeenCalledWith({ id: 'pay-1', dto });
  });

  it('should return Failure(ControllerError) if use case fails', async () => {
    const dto: ProcessRefundDto = {
      amount: 50,
      reason: 'Defective product',
    };
    const error = ErrorFactory.UseCaseError('Refund failed').error;
    useCase.execute.mockResolvedValue(Result.failure(error));

    const result = await controller.handle('pay-1', dto);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to process refund',
      ControllerError,
      error,
    );
    expect(useCase.execute).toHaveBeenCalledWith({ id: 'pay-1', dto });
  });

  it('should return Failure(ControllerError) if use case throws unexpected error', async () => {
    const dto: ProcessRefundDto = {
      amount: 50,
      reason: 'Defective product',
    };
    const error = new Error('Unexpected error');
    useCase.execute.mockRejectedValue(error);

    const result = await controller.handle('pay-1', dto);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected Controller Error',
      ControllerError,
      error,
    );
    expect(useCase.execute).toHaveBeenCalledWith({ id: 'pay-1', dto });
  });
});
