// cancel-order.controller.spec.ts
import { CancelOrderController } from './cancel-order.controller';
import { CancelOrderUseCase } from '../../../application/usecases/CancelOrder/cancel-order.usecase';
import { Result } from '../../../../../core/domain/result';
import { IOrder } from '../../../domain/interfaces/IOrder';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { OrderStatus } from '../../../domain/value-objects/order-status';

describe('CancelOrderController', () => {
  let controller: CancelOrderController;
  let mockUseCase: jest.Mocked<CancelOrderUseCase>;

  const orderId = 'OR0000001';

  const mockOrder = {
    id: orderId,
    customerId: 'CU0000001',
    items: [
      {
        id: 'item_1',
        productId: 'PR0000001',
        productName: 'Test Product',
        unitPrice: 100,
        quantity: 2,
        lineTotal: 200,
      },
      {
        id: 'item_2',
        productId: 'PR0000002',
        productName: 'Another Product',
        unitPrice: 50,
        quantity: 1,
        lineTotal: 50,
      },
    ],
    status: OrderStatus.CANCELLED,
    totalPrice: 250,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:00:00Z'),
  } as IOrder;

  beforeEach(() => {
    mockUseCase = {
      execute: jest.fn(),
    } as any;

    controller = new CancelOrderController(mockUseCase);
  });

  it('should return success result when use case succeeds', async () => {
    mockUseCase.execute.mockResolvedValue(Result.success(mockOrder));

    const result = await controller.handle('123');

    expect(mockUseCase.execute).toHaveBeenCalledWith('123');
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) expect(result.value).toEqual(mockOrder);
  });

  it('should return failure result when use case fails', async () => {
    const useCaseError = new UseCaseError('Order cannot be cancelled');
    mockUseCase.execute.mockResolvedValue(Result.failure(useCaseError));

    const result = await controller.handle('123');

    expect(result.isFailure).toBe(true);
    if (result.isFailure) expect(result.error).toBe(useCaseError);
  });

  it('should catch unexpected errors and wrap in ControllerError', async () => {
    mockUseCase.execute.mockRejectedValue(new Error('Unexpected'));

    const result = await controller.handle('123');

    expect(result.isFailure).toBe(true);
    if (result.isFailure) {
      expect(result.error.name).toBe('ControllerError');
      expect(result.error.message).toContain('Unexpected Controller Error');
    }
  });
});
