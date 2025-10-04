// cancel-order.usecase.spec.ts
import { CancelOrderUseCase } from './cancel-order.usecase';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { Result } from '../../../../../core/domain/result';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { OrderStatus } from '../../../domain/value-objects/order-status';

describe('CancelOrderUseCase', () => {
  let useCase: CancelOrderUseCase;
  let mockRepo: jest.Mocked<OrderRepository>;

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
    mockRepo = {
      cancelById: jest.fn(),
    } as any;

    useCase = new CancelOrderUseCase(mockRepo);
  });

  it('should return success result when repository cancels order', async () => {
    mockRepo.cancelById.mockResolvedValue(Result.success(mockOrder));

    const result = await useCase.execute('123');

    expect(mockRepo.cancelById).toHaveBeenCalledWith('123');
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) expect(result.value).toEqual(mockOrder);
  });

  it('should return failure result when repository fails', async () => {
    const repoError = new RepositoryError('Order not found');
    mockRepo.cancelById.mockResolvedValue(Result.failure(repoError));

    const result = await useCase.execute('123');

    expect(result.isFailure).toBe(true);
    if (result.isFailure) expect(result.error).toBe(repoError);
  });

  it('should catch unexpected errors and wrap in UseCaseError', async () => {
    mockRepo.cancelById.mockRejectedValue(new Error('DB connection failed'));

    const result = await useCase.execute('123');

    expect(result.isFailure).toBe(true);
    if (result.isFailure) {
      expect(result.error.name).toBe('UseCaseError');
      expect(result.error.message).toContain('Unexpected Usecase Error');
    }
  });
});
