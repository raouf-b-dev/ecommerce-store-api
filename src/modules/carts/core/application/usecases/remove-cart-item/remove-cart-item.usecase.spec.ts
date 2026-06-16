import { RemoveCartItemUseCase } from './remove-cart-item.usecase';
import { MockCartRepository } from '../../../../testing/mocks/cart-repository.mock';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { Cart } from '../../../domain/entities/cart';
import { CartTestFactory } from '../../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { CartOwnershipValidator } from '../../services/cart-ownership.validator';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('RemoveCartItemUseCase', () => {
  let usecase: RemoveCartItemUseCase;
  let mockCartRepository: MockCartRepository;
  let validator: CartOwnershipValidator;
  let mockTokenService: any;

  const customerContext: CallerContext = {
    kind: 'user',
    userId: 2,
    customerId: 123,
    role: 'CUSTOMER',
    permissions: new Set(['manage_own_cart']),
  };

  beforeEach(() => {
    mockCartRepository = new MockCartRepository();
    mockTokenService = {
      validateToken: jest.fn().mockResolvedValue(true),
    };
    validator = new CartOwnershipValidator(mockTokenService);
    usecase = new RemoveCartItemUseCase(mockCartRepository, validator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should remove item from cart successfully', async () => {
      const cartId = 123;
      const itemId = 1;

      const mockCartData = CartTestFactory.createCartWithItems(2, {
        id: cartId,
        customerId: 123,
      });
      const mockCart = Cart.fromPrimitives(mockCartData);
      // Ensure the items array actually has a mock item with matching ID
      const items = mockCart.getItems();
      if (items.length > 0) {
        Object.defineProperty(items[0], 'id', { value: itemId });
      }

      mockCartRepository.findById.mockResolvedValue(Result.success(mockCart));
      mockCartRepository.update.mockResolvedValue(Result.success(mockCart));

      const result = await usecase.execute({
        cartId,
        itemId,
        callerContext: customerContext,
        cartToken: null,
      });

      expect(mockCartRepository.findById).toHaveBeenCalledWith(cartId);
      expect(mockCartRepository.update).toHaveBeenCalled();
      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return failure when cart not found', async () => {
      const cartId = 404;
      const itemId = 1;
      const error = new RepositoryError('Cart not found');

      mockCartRepository.findById.mockResolvedValue(Result.failure(error));

      const result = await usecase.execute({
        cartId,
        itemId,
        callerContext: customerContext,
        cartToken: null,
      });

      expect(mockCartRepository.findById).toHaveBeenCalledWith(cartId);
      expect(mockCartRepository.update).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart not found',
        RepositoryError,
      );
    });
  });
});
