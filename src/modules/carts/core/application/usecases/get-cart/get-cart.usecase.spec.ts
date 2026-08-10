import { GetCartUseCase } from './get-cart.usecase';
import { MockCartQueryService } from '../../../../testing/mocks/cart-query-service.mock';
import { CartDtoTestFactory } from '../../../../testing/factories/cart-dto.factory';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import {
  CallerContext,
  createUserCallerContext,
} from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('GetCartUseCase', () => {
  let usecase: GetCartUseCase;
  let mockCartQueryService: MockCartQueryService;

  const adminContext: CallerContext = createUserCallerContext({
    userId: 1,
    role: 'ADMIN',
    permissions: new Set(['view_all_carts']),
  });

  const customerContext: CallerContext = createUserCallerContext({
    userId: 123,
    role: 'CUSTOMER',
    permissions: new Set(['manage_own_cart']),
  });

  const sampleCart = CartDtoTestFactory.createCartPresentationDTO({
    id: 1,
    userId: 123,
  });

  beforeEach(() => {
    mockCartQueryService = new MockCartQueryService();
    usecase = new GetCartUseCase(mockCartQueryService);
  });

  afterEach(() => {
    mockCartQueryService.reset();
  });

  describe('execute', () => {
    it('should return cart presentation by cartId when caller owns the cart', async () => {
      mockCartQueryService.mockSuccessfulGetById(sampleCart);

      const result = await usecase.execute({
        cartId: 1,
        callerContext: customerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(1);
      expect(mockCartQueryService.getById).toHaveBeenCalledWith(1, 123);
    });

    it('should return failure if cart is not found by cartId', async () => {
      mockCartQueryService.mockSuccessfulGetById(null);

      const result = await usecase.execute({
        cartId: 999,
        callerContext: customerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart 999 not found',
        UseCaseError,
      );
    });

    it('should allow admin to access cart by cartId without user constraint', async () => {
      mockCartQueryService.mockSuccessfulGetById(sampleCart);

      const result = await usecase.execute({
        cartId: 1,
        callerContext: adminContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(1);
      expect(mockCartQueryService.getById).toHaveBeenCalledWith(1, undefined);
    });
  });
});
