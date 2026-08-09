import { ListOrdersUsecase } from './list-orders.usecase';
import { MockOrderQueryService } from '../../../../testing/mocks/order-query-service.mock';
import { OrderDtoTestFactory } from '../../../../testing/factories/order-dto.factory';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../../../shared-kernel/domain/exceptions/query.error';
import { ResultAssertionHelper } from '../../../../../../testing';
import { ListOrdersQuery } from '../../queries/list-orders.query';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('ListOrdersUsecase', () => {
  let usecase: ListOrdersUsecase;
  let mockQueryService: MockOrderQueryService;

  const adminContext: CallerContext = {
    kind: 'user',
    userId: 1,
    role: 'ADMIN',
    permissions: new Set(['view_all_orders']),
  };

  const customerContext: CallerContext = {
    kind: 'user',
    userId: 2,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_orders']),
  };

  const sampleDTO = OrderDtoTestFactory.createOrderListItemDTO({
    id: 100,
    userId: 2,
  });

  beforeEach(() => {
    mockQueryService = new MockOrderQueryService();
    usecase = new ListOrdersUsecase(mockQueryService);
  });

  afterEach(() => {
    mockQueryService.reset();
  });

  it('returns success with paginated read DTOs when query service returns success for admin', async () => {
    const query: ListOrdersQuery = {};
    mockQueryService.mockSuccessfulList([sampleDTO]);

    const result = await usecase.execute({
      query,
      callerContext: adminContext,
    });

    expect(mockQueryService.list).toHaveBeenCalledWith({
      authorizedUserId: undefined,
    });
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.items).toEqual([sampleDTO]);
  });

  it('filters by authorizedUserId when caller is customer, ignoring tampered requestedUserId', async () => {
    const query: ListOrdersQuery = { requestedUserId: 999 }; // tampered
    mockQueryService.mockSuccessfulList([sampleDTO]);

    const result = await usecase.execute({
      query,
      callerContext: customerContext,
    });

    expect(mockQueryService.list).toHaveBeenCalledWith({
      requestedUserId: 999,
      authorizedUserId: 2,
    });
    ResultAssertionHelper.assertResultSuccess(result);
  });

  it('propagates query service failure as usecase failure', async () => {
    const query: ListOrdersQuery = {};
    const queryErr = new QueryError('query failed');

    mockQueryService.list.mockResolvedValue(Result.failure(queryErr));

    const result = await usecase.execute({
      query,
      callerContext: adminContext,
    });

    expect(mockQueryService.list).toHaveBeenCalledWith({
      authorizedUserId: undefined,
    });
    expect(isFailure(result)).toBe(true);
  });
});
