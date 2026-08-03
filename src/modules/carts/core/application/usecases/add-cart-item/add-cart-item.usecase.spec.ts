import { AddCartItemUseCase } from './add-cart-item.usecase';
import { MockCartRepository } from '../../../../testing/mocks/cart-repository.mock';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { Cart } from '../../../domain/entities/cart';
import { CartTestFactory } from '../../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { AddCartItemInput } from './add-cart-item.usecase';
import { CartProductGateway, ProductData } from '../../ports/product.gateway';
import { CartInventoryGateway } from '../../ports/inventory.gateway';
import { CartOwnershipValidator } from '../../services/cart-ownership.validator';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('AddCartItemUseCase', () => {
  let usecase: AddCartItemUseCase;
  let mockCartRepository: MockCartRepository;
  let mockProductGateway: jest.Mocked<CartProductGateway>;
  let mockInventoryGateway: jest.Mocked<CartInventoryGateway>;
  let validator: CartOwnershipValidator;

  const mockProduct: ProductData = {
    id: 1,
    name: 'Test Product',
    price: 29.99,
  };

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
    mockProductGateway = {
      findById: jest.fn(),
    };
    mockInventoryGateway = {
      checkStock: jest.fn(),
    };

    validator = new CartOwnershipValidator();

    usecase = new AddCartItemUseCase(
      mockCartRepository,
      validator,
      mockProductGateway,
      mockInventoryGateway,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should add item to cart successfully for admin', async () => {
      const cartId = 123;
      const input: AddCartItemInput = {
        productId: 1,
        quantity: 2,
      };

      const mockCartData = CartTestFactory.createUserCart(456);

      mockCartRepository.mockSuccessfulFind(mockCartData);
      mockProductGateway.findById.mockResolvedValue(
        Result.success(mockProduct),
      );
      mockInventoryGateway.checkStock.mockResolvedValue(
        Result.success({
          isAvailable: true,
          availableQuantity: 10,
          requestedQuantity: 2,
        }),
      );
      mockCartRepository.mockSuccessfulSave();

      const result = await usecase.execute({
        cartId,
        input,
        callerContext: adminContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should add item to cart successfully for owning customer', async () => {
      const cartId = 123;
      const input: AddCartItemInput = {
        productId: 1,
        quantity: 2,
      };

      const mockCartData = CartTestFactory.createUserCart(123);

      mockCartRepository.mockSuccessfulFind(mockCartData);
      mockProductGateway.findById.mockResolvedValue(
        Result.success(mockProduct),
      );
      mockInventoryGateway.checkStock.mockResolvedValue(
        Result.success({
          isAvailable: true,
          availableQuantity: 10,
          requestedQuantity: 2,
        }),
      );
      mockCartRepository.mockSuccessfulSave();

      const result = await usecase.execute({
        cartId,
        input,
        callerContext: customerContext,
      });

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return failure (404) when customer does not own the cart', async () => {
      const cartId = 123;
      const input: AddCartItemInput = {
        productId: 1,
        quantity: 2,
      };

      const mockCartData = CartTestFactory.createUserCart(456);

      mockCartRepository.mockSuccessfulFind(mockCartData);

      const result = await usecase.execute({
        cartId,
        input,
        callerContext: customerContext,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart with id 123 not found',
        UseCaseError,
      );
    });

    it('should return failure when cart not found', async () => {
      const cartId = 404;
      const input: AddCartItemInput = {
        productId: 1,
        quantity: 1,
      };

      mockCartRepository.mockCartNotFound(String(cartId));

      const result = await usecase.execute({
        cartId,
        input,
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
