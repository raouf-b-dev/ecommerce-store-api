import { Test, TestingModule } from '@nestjs/testing';
import { ListPaymentsController } from './list-payments.controller';
import { ListPaymentsUseCase } from '../../../application/usecases/list-payments/list-payments.usecase';
import { ListPaymentsQueryDto } from '../../dto/list-payments-query.dto';
import { Result } from '../../../../../core/domain/result';
import { Payment } from '../../../domain/entities/payment';
import { ResultAssertionHelper } from '../../../../../testing';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentMethodType } from '../../../domain';

describe('ListPaymentsController', () => {
  let controller: ListPaymentsController;
  let useCase: jest.Mocked<ListPaymentsUseCase>;

  beforeEach(async () => {
    const mockUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListPaymentsController],
      providers: [
        {
          provide: ListPaymentsUseCase,
          useValue: mockUseCase,
        },
      ],
    }).compile();

    controller = module.get<ListPaymentsController>(ListPaymentsController);
    useCase = module.get(ListPaymentsUseCase);
  });

  it('should list payments successfully', async () => {
    const dto: ListPaymentsQueryDto = {
      orderId: 'order-1',
    };

    const payment = Payment.create(
      'pay-1',
      'order-1',
      100,
      'USD',
      PaymentMethodType.CREDIT_CARD,
      'cust-1',
    );

    useCase.execute.mockResolvedValue(Result.success([payment.toPrimitives()]));

    const result = await controller.handle(dto);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toHaveLength(1);
    expect(result.value[0].id).toBe('pay-1');
    expect(useCase.execute).toHaveBeenCalledWith(dto);
  });

  it('should return Failure(ControllerError) if use case fails', async () => {
    const dto: ListPaymentsQueryDto = {
      orderId: 'order-1',
    };
    const error = ErrorFactory.UseCaseError('List failed').error;
    useCase.execute.mockResolvedValue(Result.failure(error));

    const result = await controller.handle(dto);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to list payments',
      ControllerError,
      error,
    );
    expect(useCase.execute).toHaveBeenCalledWith(dto);
  });

  it('should return Failure(ControllerError) if use case throws unexpected error', async () => {
    const dto: ListPaymentsQueryDto = {
      orderId: 'order-1',
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
