import { UpdateCartItemUseCase } from './update-cart-item.usecase';
import { MockCartRepository } from '../../../../testing/mocks/cart-repository.mock';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { Cart } from '../../../domain/entities/cart';
import { CartTestFactory } from '../../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { UpdateCartItemInput } from './update-cart-item.usecase';
import { InventoryGateway } from '../../ports/inventory.gateway';
import { CartOwnershipValidator } from '../../services/cart-ownership.validator';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('UpdateCartItemUseCase', () => {
  let usecase: UpdateCartItemUseCase;
  let mockCartRepository: MockCartRepository;
  let mockInventoryGateway: jest.Mocked<InventoryGateway>;
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
    mockInventoryGateway = {
      checkStock: jest.fn(),
    };
    mockTokenService = {
      validateToken: jest.fn().mockResolvedValue(true),
    };
    validator = new CartOwnershipValidator(mockTokenService);

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
      const cartId = 123;
      const itemId = 1;
      const input: UpdateCartItemInput = { quantity: 5 };

      const mockCartData = CartTestFactory.createCartWithItems(2, {
        id: cartId,
        customerId: 123,
      });
      const mockCart = Cart.fromPrimitives(mockCartData);
      const items = mockCart.getItems();
      if (items.length > 0) {
        Object.defineProperty(items[0], 'id', { value: itemId });
      }

      mockCartRepository.findById.mockResolvedValue(Result.success(mockCart));
      mockInventoryGateway.checkStock.mockResolvedValue(
        Result.success({
          isAvailable: true,
          availableQuantity: 10,
          requestedQuantity: 5,
        }),
      );
      mockCartRepository.update.mockResolvedValue(Result.success(mockCart));

      const result = await usecase.execute({
        cartId,
        itemId,
        input,
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
      const input: UpdateCartItemInput = { quantity: 2 };
      const error = new RepositoryError('Cart not found');

      mockCartRepository.findById.mockResolvedValue(Result.failure(error));

      const result = await usecase.execute({
        cartId,
        itemId,
        input,
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

    it('should return failure when stock is insufficient', async () => {
      const cartId = 123;
      const itemId = 1;
      const input: UpdateCartItemInput = { quantity: 20 };

      const mockCartData = CartTestFactory.createCartWithItems(2, {
        id: cartId,
        customerId: 123,
      });
      const mockCart = Cart.fromPrimitives(mockCartData);
      const items = mockCart.getItems();
      if (items.length > 0) {
        Object.defineProperty(items[0], 'id', { value: itemId });
      }

      mockCartRepository.findById.mockResolvedValue(Result.success(mockCart));
      mockInventoryGateway.checkStock.mockResolvedValue(
        Result.success({
          isAvailable: false,
          availableQuantity: 5,
          requestedQuantity: 20,
        }),
      );

      const result = await usecase.execute({
        cartId,
        itemId,
        input,
        callerContext: customerContext,
        cartToken: null,
      });

      expect(mockInventoryGateway.checkStock).toHaveBeenCalledWith(
        expect.any(Number),
        input.quantity,
      );
      ResultAssertionHelper.assertResultFailure(
        result,
        'Insufficient stock',
        UseCaseError,
      );
    });
  });
});
