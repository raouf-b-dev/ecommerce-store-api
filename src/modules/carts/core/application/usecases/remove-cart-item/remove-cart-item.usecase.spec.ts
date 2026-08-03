import { RemoveCartItemUseCase } from './remove-cart-item.usecase';
import { MockCartRepository } from '../../../../testing/mocks/cart-repository.mock';
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

  const customerContext: CallerContext = {
    kind: 'user',
    userId: 123,
    role: 'CUSTOMER',
    permissions: new Set(['manage_own_cart']),
  };

  beforeEach(() => {
    mockCartRepository = new MockCartRepository();
    validator = new CartOwnershipValidator();
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
        userId: 123,
      });
      const mockCart = Cart.fromPrimitives(mockCartData);
      const items = mockCart.getItems();
      if (items.length > 0) {
        Object.defineProperty(items[0], 'id', { value: itemId });
      }

      mockCartRepository.mockSuccessfulFind(mockCartData);
      mockCartRepository.mockSuccessfulSave();

      const result = await usecase.execute({
        cartId,
        itemId,
        callerContext: customerContext,
      });

      expect(mockCartRepository.findByIdForUpdate).toHaveBeenCalledWith(cartId);
      expect(mockCartRepository.save).toHaveBeenCalled();
      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return failure when cart not found', async () => {
      const cartId = 404;
      const itemId = 1;

      mockCartRepository.mockCartNotFound(String(cartId));

      const result = await usecase.execute({
        cartId,
        itemId,
        callerContext: customerContext,
      });

      expect(mockCartRepository.findByIdForUpdate).toHaveBeenCalledWith(cartId);
      expect(mockCartRepository.save).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart not found',
        RepositoryError,
      );
    });
  });
});
