import { ListOrdersUsecase } from './list-orders.usecase';
import { MockOrderRepository } from '../../../../testing/mocks/order-repository.mock';
import { OrderTestFactory } from '../../../../testing/factories/order.factory';
import { isFailure } from '../../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Order } from '../../../domain/entities/order';
import { ListOrdersQuery } from '../../../domain/repositories/order-repository';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('ListOrdersUsecase', () => {
  let usecase: ListOrdersUsecase;
  let mockRepository: MockOrderRepository;

  const adminContext: CallerContext = {
    kind: 'user',
    userId: 1,
    customerId: null,
    role: 'ADMIN',
    permissions: new Set(['view_all_orders']),
  };

  const customerContext: CallerContext = {
    kind: 'user',
    userId: 2,
    customerId: 123,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_orders']),
  };

  beforeEach(() => {
    mockRepository = new MockOrderRepository();
    usecase = new ListOrdersUsecase(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  it('returns success with list of orders when repository returns success and caller is admin', async () => {
    const query: ListOrdersQuery = {};
    const sampleOrder = Order.fromPrimitives(
      OrderTestFactory.createMockOrder(),
    );

    mockRepository.mockSuccessfulList([sampleOrder]);

    const result = await usecase.execute({
      query,
      callerContext: adminContext,
    });

    expect(mockRepository.listOrders).toHaveBeenCalledWith(query);
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual([sampleOrder]);
  });

  it('filters by customer ID when caller is customer, ignoring tampered customerId query param', async () => {
    const query: ListOrdersQuery = { customerId: 999 }; // tampered
    const sampleOrder = Order.fromPrimitives(
      OrderTestFactory.createMockOrder({ customerId: 123 }),
    );

    mockRepository.mockSuccessfulList([sampleOrder]);

    const result = await usecase.execute({
      query,
      callerContext: customerContext,
    });

    expect(mockRepository.listOrders).toHaveBeenCalledWith({ customerId: 123 });
    ResultAssertionHelper.assertResultSuccess(result);
  });

  it('propagates repository failure as usecase failure', async () => {
    const query: ListOrdersQuery = {};
    const repoErr = new RepositoryError('repo failed');

    mockRepository.listOrders.mockResolvedValue(Result.failure(repoErr));

    const result = await usecase.execute({
      query,
      callerContext: adminContext,
    });

    expect(mockRepository.listOrders).toHaveBeenCalledWith(query);
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toBe(repoErr);
    }
  });
});
