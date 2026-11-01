import { RemoveCartItemUseCase } from './remove-cart-item.usecase';
import { Cart } from '../../../domain/entities/cart';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorCode } from '../../../../../../shared-kernel/domain/exceptions/error-code';
import { ErrorKind } from '../../../../../../shared-kernel/domain/exceptions/error-kind';
import { CartOwnershipValidator } from '../../services/cart-ownership.validator';
import { AuthPayloadFactory } from 'src/testing/factories/auth-payload.factory';
import { CartTestFactory, MockCartRepository } from 'src/modules/carts/testing';
import { createUserCallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('RemoveCartItemUseCase', () => {
  let usecase: RemoveCartItemUseCase;
  let mockCartRepository: MockCartRepository;
  let validator: CartOwnershipValidator;

  const customerContext = AuthPayloadFactory.createCustomerContext();

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
        `Cart with id ${cartId} not found`,
        UseCaseError,
      );
      expect(result.error.code).toBe(ErrorCode.CART_NOT_FOUND);
      expect(result.error.kind).toBe(ErrorKind.NOT_FOUND);
    });

    it('should return CART_NOT_FOUND when caller does not own the cart', async () => {
      const cartId = 123;
      const itemId = 1;
      const mockCartData = CartTestFactory.createCartWithItems(1, {
        id: cartId,
        userId: 123,
      });
      mockCartRepository.mockSuccessfulFind(mockCartData);

      const result = await usecase.execute({
        cartId,
        itemId,
        callerContext: createUserCallerContext({
          userId: 999,
          role: 'CUSTOMER',
          permissions: new Set(['manage_own_cart']),
        }),
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Cart with id ${cartId} not found`,
        UseCaseError,
      );
      expect(result.error.code).toBe(ErrorCode.CART_NOT_FOUND);
      expect(result.error.kind).toBe(ErrorKind.NOT_FOUND);
      expect(mockCartRepository.save).not.toHaveBeenCalled();
    });

    it('should return CART_ITEM_NOT_FOUND when item is missing', async () => {
      const cartId = 123;
      const itemId = 999;
      const mockCartData = CartTestFactory.createCartWithItems(1, {
        id: cartId,
        userId: 123,
      });
      mockCartRepository.mockSuccessfulFind(mockCartData);

      const result = await usecase.execute({
        cartId,
        itemId,
        callerContext: customerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        `Item with id ${itemId} not found in cart`,
        UseCaseError,
      );
      expect(result.error.code).toBe(ErrorCode.CART_ITEM_NOT_FOUND);
      expect(result.error.kind).toBe(ErrorKind.NOT_FOUND);
      expect(mockCartRepository.save).not.toHaveBeenCalled();
    });
  });
});
