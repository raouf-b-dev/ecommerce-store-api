import {
  MockOrderQueryService,
  OrderDtoTestFactory,
} from 'src/modules/orders/testing';
import { GetOrderUseCase } from './get-order.usecase';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorCode } from '../../../../../../shared-kernel/domain/exceptions/error-code';
import { ErrorKind } from '../../../../../../shared-kernel/domain/exceptions/error-kind';
import {
  QueryError,
  QueryNotFoundError,
} from '../../../../../../shared-kernel/domain/exceptions/query.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ResultAssertionHelper } from '../../../../../../testing';
import {
  CallerContext,
  createUserCallerContext,
} from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('GetOrderUseCase', () => {
  let useCase: GetOrderUseCase;
  let mockQueryService: MockOrderQueryService;

  const adminContext: CallerContext = createUserCallerContext({
    userId: 1,
    role: 'ADMIN',
    permissions: new Set(['view_all_orders', 'view_customer_pii']),
  });

  const viewerContext = createUserCallerContext({
    userId: 3,
    role: 'ADMIN_READONLY',
    permissions: new Set(['access_admin', 'view_all_orders']),
  });

  const customerContext: CallerContext = createUserCallerContext({
    userId: 2,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_orders']),
  });

  const sampleDetail = OrderDtoTestFactory.createOrderDetailDTO({
    id: 1,
    userId: 2,
  });

  beforeEach(() => {
    mockQueryService = new MockOrderQueryService();
    useCase = new GetOrderUseCase(mockQueryService);
  });

  afterEach(() => {
    mockQueryService.reset();
  });

  describe('execute', () => {
    it('should return Success with order detail when order is found and caller has view_all_orders', async () => {
      const orderId = 1;
      mockQueryService.mockSuccessfulGetById(sampleDetail);

      const result = await useCase.execute({
        orderId,
        callerContext: adminContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(orderId);
      expect(result.value.status).toBe('pending_payment');
      expect(mockQueryService.getById).toHaveBeenCalledWith(orderId, undefined);
    });

    it('should return Success with order when order belongs to the customer', async () => {
      const orderId = 1;
      mockQueryService.mockSuccessfulGetById(sampleDetail);

      const result = await useCase.execute({
        orderId,
        callerContext: customerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(orderId);
      expect(result.value.userId).toBe(2);
      expect(mockQueryService.getById).toHaveBeenCalledWith(orderId, 2);
    });

    it('should return Failure (404) when order belongs to a different customer or not found', async () => {
      const orderId = 1;
      mockQueryService.mockSuccessfulGetById(null);

      const result = await useCase.execute({
        orderId,
        callerContext: customerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Order with id ${orderId} not found`,
        UseCaseError,
      );
      expect(result.error.kind).toBe(ErrorKind.NOT_FOUND);
      expect(result.error.code).toBe(ErrorCode.ORDER_NOT_FOUND);
    });

    it('returns ORDER_NOT_FOUND when the query reports not found', async () => {
      const orderId = 1;
      mockQueryService.getById.mockResolvedValue(
        Result.failure(
          new QueryNotFoundError(`Order with id ${orderId} not found`),
        ),
      );

      const result = await useCase.execute({
        orderId,
        callerContext: customerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Order with id ${orderId} not found`,
        UseCaseError,
      );
      expect(result.error.kind).toBe(ErrorKind.NOT_FOUND);
      expect(result.error.code).toBe(ErrorCode.ORDER_NOT_FOUND);
    });

    it('propagates a query failure with its kind', async () => {
      const queryError = new QueryError('DB down', {
        kind: ErrorKind.UNAVAILABLE,
      });
      mockQueryService.getById.mockResolvedValue(Result.failure(queryError));

      const result = await useCase.execute({
        orderId: 1,
        callerContext: adminContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'DB down',
        UseCaseError,
      );
      expect(result.error.kind).toBe(ErrorKind.UNAVAILABLE);
      expect(result.error.cause).toBe(queryError);
    });

    it('should mask customer contact data for a caller without view_customer_pii', async () => {
      mockQueryService.mockSuccessfulGetById(sampleDetail);

      const result = await useCase.execute({
        orderId: 1,
        callerContext: viewerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual({
        ...sampleDetail,
        userName: 'Customer #2',
        userEmail: expect.stringMatching(/^.\*\*\*@\*\*\*/),
        shippingAddress: null,
      });
    });

    it('should keep contact data for an admin with view_customer_pii', async () => {
      mockQueryService.mockSuccessfulGetById(sampleDetail);

      const result = await useCase.execute({
        orderId: 1,
        callerContext: adminContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(sampleDetail);
    });
  });
});
