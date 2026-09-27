import { AddCartItemUseCase } from './add-cart-item.usecase';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { AddCartItemCommand } from '../../commands/add-cart-item.command';
import { CartOwnershipValidator } from '../../services/cart-ownership.validator';
import { AuthPayloadFactory } from 'src/testing/factories/auth-payload.factory';
import {
  CartGatewayDtoFactory,
  CartTestFactory,
  MockCartInventoryGateway,
  MockCartProductGateway,
  MockCartRepository,
} from 'src/modules/carts/testing';

describe('AddCartItemUseCase', () => {
  let usecase: AddCartItemUseCase;
  let mockCartRepository: MockCartRepository;
  let mockProductGateway: MockCartProductGateway;
  let mockInventoryGateway: MockCartInventoryGateway;
  let validator: CartOwnershipValidator;

  const mockProduct = CartGatewayDtoFactory.createProductData();

  const adminContext = AuthPayloadFactory.createAdminContext({ userId: 1 });
  const customerContext = AuthPayloadFactory.createCustomerContext();

  beforeEach(() => {
    mockCartRepository = new MockCartRepository();
    mockProductGateway = new MockCartProductGateway();
    mockInventoryGateway = new MockCartInventoryGateway();
    validator = new CartOwnershipValidator();

    usecase = new AddCartItemUseCase(
      mockCartRepository,
      validator,
      mockProductGateway,
      mockInventoryGateway,
    );
  });

  describe('execute', () => {
    it('should add item to cart successfully for admin', async () => {
      const command: AddCartItemCommand = {
        cartId: 123,
        productId: 1,
        quantity: 2,
        callerContext: adminContext,
      };

      const mockCartData = CartTestFactory.createUserCart(123);

      mockCartRepository.mockSuccessfulFind(mockCartData);
      mockProductGateway.mockSuccessfulFindById(mockProduct);
      mockInventoryGateway.mockSuccessfulCheckStock({
        isAvailable: true,
        availableQuantity: 10,
        requestedQuantity: 2,
      });
      mockCartRepository.mockSuccessfulSave();

      const result = await usecase.execute(command);

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should add item to cart successfully for owning customer', async () => {
      const command: AddCartItemCommand = {
        cartId: 123,
        productId: 1,
        quantity: 2,
        callerContext: customerContext,
      };

      const mockCartData = CartTestFactory.createUserCart(123);

      mockCartRepository.mockSuccessfulFind(mockCartData);
      mockProductGateway.mockSuccessfulFindById(mockProduct);
      mockInventoryGateway.mockSuccessfulCheckStock({
        isAvailable: true,
        availableQuantity: 10,
        requestedQuantity: 2,
      });
      mockCartRepository.mockSuccessfulSave();

      const result = await usecase.execute(command);

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return failure (404) when customer does not own the cart', async () => {
      const command: AddCartItemCommand = {
        cartId: 123,
        productId: 1,
        quantity: 2,
        callerContext: customerContext,
      };

      const mockCartData = CartTestFactory.createUserCart(456);

      mockCartRepository.mockSuccessfulFind(mockCartData);

      const result = await usecase.execute(command);

      ResultAssertionHelper.assertResultFailure(result);
    });

    it('should return failure when cart is not found', async () => {
      const command: AddCartItemCommand = {
        cartId: 999,
        productId: 1,
        quantity: 2,
        callerContext: adminContext,
      };

      mockCartRepository.mockCartNotFound('999');

      const result = await usecase.execute(command);

      ResultAssertionHelper.assertResultFailure(result);
    });

    it('should return failure when stock is insufficient', async () => {
      const command: AddCartItemCommand = {
        cartId: 123,
        productId: 1,
        quantity: 10,
        callerContext: adminContext,
      };

      const mockCartData = CartTestFactory.createUserCart(123);

      mockCartRepository.mockSuccessfulFind(mockCartData);
      mockProductGateway.mockSuccessfulFindById(mockProduct);
      mockInventoryGateway.mockSuccessfulCheckStock({
        isAvailable: false,
        availableQuantity: 5,
        requestedQuantity: 10,
      });

      const result = await usecase.execute(command);

      ResultAssertionHelper.assertResultFailure(result);
    });
  });
});
