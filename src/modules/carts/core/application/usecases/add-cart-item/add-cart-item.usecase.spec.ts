import { AddCartItemUseCase } from './add-cart-item.usecase';
import { MockCartRepository } from '../../../../testing/mocks/cart-repository.mock';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { Cart } from '../../../domain/entities/cart';
import { CartTestFactory } from '../../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { AddCartItemDto } from '../../../../primary-adapters/dto/add-cart-item.dto';
import { ProductGateway, ProductData } from '../../ports/product.gateway';
import { InventoryGateway } from '../../ports/inventory.gateway';

describe('AddCartItemUseCase', () => {
  let usecase: AddCartItemUseCase;
  let mockCartRepository: MockCartRepository;
  let mockProductGateway: jest.Mocked<ProductGateway>;
  let mockInventoryGateway: jest.Mocked<InventoryGateway>;

  const mockProduct: ProductData = {
    id: 1,
    name: 'Test Product',
    price: 29.99,
  };

  beforeEach(() => {
    mockCartRepository = new MockCartRepository();
    mockProductGateway = {
      findById: jest.fn(),
    };
    mockInventoryGateway = {
      checkStock: jest.fn(),
    };

    usecase = new AddCartItemUseCase(
      mockCartRepository,
      mockProductGateway,
      mockInventoryGateway,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    it('should add item to cart successfully', async () => {
      // Arrange
      const cartId = 123;
      const dto: AddCartItemDto = {
        productId: 1,
        quantity: 2,
      };

      const mockCartData = CartTestFactory.createEmptyCart({ id: cartId });
      const mockCart = Cart.fromPrimitives(mockCartData);

      mockCartRepository.findById.mockResolvedValue(Result.success(mockCart));
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
      mockCartRepository.update.mockResolvedValue(Result.success(mockCart));

      // Act
      const result = await usecase.execute({ cartId, dto });

      // Assert
      expect(mockCartRepository.findById).toHaveBeenCalledWith(cartId);
      expect(mockProductGateway.findById).toHaveBeenCalledWith(dto.productId);
      expect(mockCartRepository.update).toHaveBeenCalled();
      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return failure when cart not found', async () => {
      // Arrange
      const cartId = 404;
      const dto: AddCartItemDto = {
        productId: 1,
        quantity: 1,
      };
      const error = new RepositoryError('Cart not found');

      mockCartRepository.findById.mockResolvedValue(Result.failure(error));

      // Act
      const result = await usecase.execute({ cartId, dto });

      // Assert
      expect(mockCartRepository.findById).toHaveBeenCalledWith(cartId);
      expect(mockProductGateway.findById).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart not found',
        RepositoryError,
      );
    });

    it('should return failure when product not found', async () => {
      // Arrange
      const cartId = 123;
      const dto: AddCartItemDto = {
        productId: 404,
        quantity: 1,
      };

      const mockCartData = CartTestFactory.createEmptyCart({ id: cartId });
      const mockCart = Cart.fromPrimitives(mockCartData);
      const error = new RepositoryError('Product not found');

      mockCartRepository.findById.mockResolvedValue(Result.success(mockCart));
      mockProductGateway.findById.mockResolvedValue(Result.failure(error));

      // Act
      const result = await usecase.execute({ cartId, dto });

      // Assert
      expect(mockProductGateway.findById).toHaveBeenCalledWith(dto.productId);
      ResultAssertionHelper.assertResultFailure(
        result,
        'Product not found',
        RepositoryError,
      );
    });

    it('should return failure when stock is insufficient', async () => {
      // Arrange
      const cartId = 123;
      const dto: AddCartItemDto = {
        productId: 1,
        quantity: 20,
      };

      const mockCartData = CartTestFactory.createEmptyCart({ id: cartId });
      const mockCart = Cart.fromPrimitives(mockCartData);

      mockCartRepository.findById.mockResolvedValue(Result.success(mockCart));
      mockProductGateway.findById.mockResolvedValue(
        Result.success(mockProduct),
      );
      mockInventoryGateway.checkStock.mockResolvedValue(
        Result.success({
          isAvailable: false,
          availableQuantity: 5,
          requestedQuantity: 20,
        }),
      );

      // Act
      const result = await usecase.execute({ cartId, dto });

      // Assert
      expect(mockInventoryGateway.checkStock).toHaveBeenCalledWith(
        dto.productId,
        dto.quantity,
      );
      ResultAssertionHelper.assertResultFailure(
        result,
        'Insufficient stock',
        UseCaseError,
      );
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const cartId = 123;
      const dto: AddCartItemDto = {
        productId: 1,
        quantity: 1,
      };
      const error = new Error('Database connection failed');

      mockCartRepository.findById.mockRejectedValue(error);

      // Act
      const result = await usecase.execute({ cartId, dto });

      // Assert
      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected use case error',
        UseCaseError,
      );
    });
  });
});
