// src/modules/orders/presentation/controllers/process-order.controller.spec.ts
import { ProcessOrderController } from './process-order.controller';
import { ProcessOrderUseCase } from '../../../application/usecases/process-order/process-order.usecase';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ResultAssertionHelper } from '../../../../../testing';
import { OrderTestFactory } from '../../../testing/factories/order.factory';

const mockProcessOrderUseCase = {
  execute: jest.fn(),
};

describe('ProcessOrderController', () => {
  let controller: ProcessOrderController;
  let mockProcessedOrder: IOrder;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new ProcessOrderController(
      mockProcessOrderUseCase as any as ProcessOrderUseCase,
    );

    mockProcessedOrder = OrderTestFactory.createProcessingOrder();
  });

  it('should return a successful result with the processed order', async () => {
    // Arrange:
    const orderId = mockProcessedOrder.id;
    const successResult = Result.success(mockProcessedOrder);
    mockProcessOrderUseCase.execute.mockResolvedValue(successResult);

    // Act:
    const result = await controller.handle(orderId!);

    // Assert:
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual(mockProcessedOrder);
    expect(mockProcessOrderUseCase.execute).toHaveBeenCalledWith(orderId);
  });

  it('should return a failure result if the use case fails', async () => {
    // Arrange:
    const orderId = 1;
    const error = ErrorFactory.UseCaseError('Order not found');
    mockProcessOrderUseCase.execute.mockResolvedValue(error);

    // Act:
    const result = await controller.handle(orderId);

    ResultAssertionHelper.assertResultFailure(result, 'Order not found');
    expect(mockProcessOrderUseCase.execute).toHaveBeenCalledWith(orderId);
  });

  it('should return a ControllerError if the use case throws an unexpected error', async () => {
    // Arrange:
    const orderId = 1;
    const error = new Error('Something exploded');
    mockProcessOrderUseCase.execute.mockRejectedValue(error);

    // Act:
    const result = await controller.handle(orderId);

    // Assert:
    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected Controller Error',
      ControllerError,
      error,
    );
    expect(mockProcessOrderUseCase.execute).toHaveBeenCalledWith(orderId);
  });
});
