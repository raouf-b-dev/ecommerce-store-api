import { UpdateCartItemUseCase } from './update-cart-item.usecase';
import { Cart } from '../../../domain/entities/cart';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { UpdateCartItemCommand } from '../../commands/update-cart-item.command';
import { CartOwnershipValidator } from '../../services/cart-ownership.validator';
import { AuthPayloadFactory } from 'src/testing/factories/auth-payload.factory';
import {
  CartTestFactory,
  MockCartInventoryGateway,
  MockCartRepository,
} from 'src/modules/carts/testing';

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
        'Cart not found',
        RepositoryError,
      );
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
