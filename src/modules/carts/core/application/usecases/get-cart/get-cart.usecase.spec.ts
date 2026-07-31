import { GetCartUseCase } from './get-cart.usecase';
import { MockCartRepository } from '../../../../testing/mocks/cart-repository.mock';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { Cart } from '../../../domain/entities/cart';
import { CartTestFactory } from '../../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { CartOwnershipValidator } from '../../services/cart-ownership.validator';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('GetCartUseCase', () => {
  let usecase: GetCartUseCase;
  let mockCartRepository: MockCartRepository;
  let validator: CartOwnershipValidator;

  const adminContext: CallerContext = {
    kind: 'user',
    userId: 1,
    role: 'ADMIN',
    permissions: new Set(['manage_carts']),
  };

  const customerContext: CallerContext = {
    kind: 'user',
    userId: 123,
    role: 'CUSTOMER',
    permissions: new Set(['manage_own_cart']),
  };

  beforeEach(() => {
    mockCartRepository = new MockCartRepository();
    validator = new CartOwnershipValidator();
    usecase = new GetCartUseCase(mockCartRepository, validator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return cart when found and caller has admin access', async () => {
      const cartId = 123;
      const mockCartData = CartTestFactory.createUserCart(456);
      const mockCart = Cart.fromPrimitives(mockCartData);
      Object.defineProperty(mockCart, 'id', { value: cartId });

      mockCartRepository.findById.mockResolvedValue(Result.success(mockCart));

      const result = await usecase.execute({
        cartId,
        callerContext: adminContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.userId).toBe(456);
    });

    it('should return cart when caller owns the user cart', async () => {
      const cartId = 123;
      const mockCartData = CartTestFactory.createUserCart(123);
      const mockCart = Cart.fromPrimitives(mockCartData);
      Object.defineProperty(mockCart, 'id', { value: cartId });

      mockCartRepository.findById.mockResolvedValue(Result.success(mockCart));

      const result = await usecase.execute({
        cartId,
        callerContext: customerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.userId).toBe(123);
    });

    it('should return 404 when customer does not own the cart', async () => {
      const cartId = 123;
      const mockCartData = CartTestFactory.createUserCart(456);
      const mockCart = Cart.fromPrimitives(mockCartData);
      Object.defineProperty(mockCart, 'id', { value: cartId });

      mockCartRepository.findById.mockResolvedValue(Result.success(mockCart));

      const result = await usecase.execute({
        cartId,
        callerContext: customerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart with id 123 not found',
        UseCaseError,
      );
    });

    it('should return failure when cart not found in repository', async () => {
      const cartId = 404;
      const error = new RepositoryError('Cart not found');

      mockCartRepository.findById.mockResolvedValue(Result.failure(error));

      const result = await usecase.execute({
        cartId,
        callerContext: adminContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart not found',
        RepositoryError,
      );
    });
  });
});
