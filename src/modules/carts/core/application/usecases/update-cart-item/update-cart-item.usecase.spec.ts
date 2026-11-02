import { UpdateCartItemUseCase } from './update-cart-item.usecase';
import { Cart } from '../../../domain/entities/cart';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorCode } from '../../../../../../shared-kernel/domain/exceptions/error-code';
import { ErrorKind } from '../../../../../../shared-kernel/domain/exceptions/error-kind';
import { UpdateCartItemCommand } from '../../commands/update-cart-item.command';
import { CartOwnershipValidator } from '../../services/cart-ownership.validator';
import { AuthPayloadFactory } from 'src/testing/factories/auth-payload.factory';
import {
  CartTestFactory,
  MockCartInventoryGateway,
  MockCartRepository,
} from 'src/modules/carts/testing';
import { createUserCallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('UpdateCartItemUseCase', () => {
  let usecase: UpdateCartItemUseCase;
  let mockCartRepository: MockCartRepository;
  let mockInventoryGateway: MockCartInventoryGateway;
  let validator: CartOwnershipValidator;

  const customerContext = AuthPayloadFactory.createCustomerContext();

  beforeEach(() => {
    mockCartRepository = new MockCartRepository();
    mockInventoryGateway = new MockCartInventoryGateway();
    validator = new CartOwnershipValidator();

    usecase = new UpdateCartItemUseCase(
      mockCartRepository,
      validator,
      mockInventoryGateway,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should update item quantity successfully', async () => {
      const command: UpdateCartItemCommand = {
        cartId: 123,
        itemId: 1,
        quantity: 5,
        callerContext: customerContext,
      };

      const mockCartData = CartTestFactory.createCartWithItems(2, {
        id: 123,
        userId: 123,
      });
      const mockCart = Cart.fromPrimitives(mockCartData);
      const items = mockCart.getItems();
      if (items.length > 0) {
        Object.defineProperty(items[0], 'id', { value: 1 });
      }

      mockCartRepository.mockSuccessfulFind(mockCartData);
      mockInventoryGateway.mockSuccessfulCheckStock({
        isAvailable: true,
        availableQuantity: 10,
        requestedQuantity: 5,
      });
      mockCartRepository.mockSuccessfulSave();

      const result = await usecase.execute(command);

      expect(mockCartRepository.findByIdForUpdate).toHaveBeenCalledWith(123);
      expect(mockCartRepository.save).toHaveBeenCalled();
      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return failure when cart not found', async () => {
      const command: UpdateCartItemCommand = {
        cartId: 404,
        itemId: 1,
        quantity: 2,
        callerContext: customerContext,
      };

      mockCartRepository.mockCartNotFound('404');

      const result = await usecase.execute(command);

      expect(mockCartRepository.findByIdForUpdate).toHaveBeenCalledWith(404);
      expect(mockCartRepository.save).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart with id 404 not found',
        UseCaseError,
      );
      expect(result.error.code).toBe(ErrorCode.CART_NOT_FOUND);
      expect(result.error.kind).toBe(ErrorKind.NOT_FOUND);
    });

    it('should return CART_NOT_FOUND when caller does not own the cart', async () => {
      const command: UpdateCartItemCommand = {
        cartId: 123,
        itemId: 1,
        quantity: 2,
        callerContext: createUserCallerContext({
          userId: 999,
          role: 'CUSTOMER',
          permissions: new Set(['manage_own_cart']),
        }),
      };

      const mockCartData = CartTestFactory.createCartWithItems(1, {
        id: 123,
        userId: 123,
      });
      mockCartRepository.mockSuccessfulFind(mockCartData);

      const result = await usecase.execute(command);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart with id 123 not found',
        UseCaseError,
      );
      expect(result.error.code).toBe(ErrorCode.CART_NOT_FOUND);
      expect(result.error.kind).toBe(ErrorKind.NOT_FOUND);
      expect(mockCartRepository.save).not.toHaveBeenCalled();
    });

    it('should return CART_ITEM_NOT_FOUND when item is missing', async () => {
      const command: UpdateCartItemCommand = {
        cartId: 123,
        itemId: 999,
        quantity: 2,
        callerContext: customerContext,
      };

      const mockCartData = CartTestFactory.createCartWithItems(1, {
        id: 123,
        userId: 123,
      });
      mockCartRepository.mockSuccessfulFind(mockCartData);

      const result = await usecase.execute(command);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Item with id 999 not found in cart',
        UseCaseError,
      );
      expect(result.error.code).toBe(ErrorCode.CART_ITEM_NOT_FOUND);
      expect(result.error.kind).toBe(ErrorKind.NOT_FOUND);
      expect(mockCartRepository.save).not.toHaveBeenCalled();
    });

    it('should return failure when stock is insufficient', async () => {
      const command: UpdateCartItemCommand = {
        cartId: 123,
        itemId: 1,
        quantity: 20,
        callerContext: customerContext,
      };

      const mockCartData = CartTestFactory.createCartWithItems(2, {
        id: 123,
        userId: 123,
      });
      const mockCart = Cart.fromPrimitives(mockCartData);
      const items = mockCart.getItems();
      if (items.length > 0) {
        Object.defineProperty(items[0], 'id', { value: 1 });
      }

      mockCartRepository.mockSuccessfulFind(mockCartData);
      mockInventoryGateway.mockSuccessfulCheckStock({
        isAvailable: false,
        availableQuantity: 5,
        requestedQuantity: 20,
      });

      const result = await usecase.execute(command);

      expect(mockInventoryGateway.checkStock).toHaveBeenCalledWith(
        expect.any(Number),
        20,
      );
      ResultAssertionHelper.assertResultFailure(
        result,
        'Insufficient stock',
        UseCaseError,
      );
    });
  });
});
