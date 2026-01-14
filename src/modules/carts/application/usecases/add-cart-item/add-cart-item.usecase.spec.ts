import { AddCartItemUseCase } from './add-cart-item.usecase';
import { MockCartRepository } from '../../../testing/mocks/cart-repository.mock';
import { Result } from '../../../../../core/domain/result';
import { Cart } from '../../../domain/entities/cart';
import { CartTestFactory } from '../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { AddCartItemDto } from '../../../presentation/dto/add-cart-item.dto';
import { ProductRepository } from '../../../../products/domain/repositories/product-repository';
import { IProduct } from '../../../../products/domain/interfaces/product.interface';
import { InventoryGateway } from '../../ports/inventory.gateway';

describe('AddCartItemUseCase', () => {
  let usecase: AddCartItemUseCase;
  let mockCartRepository: MockCartRepository;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let mockInventoryGateway: jest.Mocked<InventoryGateway>;

  const mockProduct: IProduct = {
    id: 1,
    name: 'Test Product',
    description: 'Test Description',
    price: 29.99,
    sku: 'TEST-SKU-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockCartRepository = new MockCartRepository();
    mockProductRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      deleteById: jest.fn(),
    } as any;
    mockInventoryGateway = {
      checkStock: jest.fn(),
    };

    usecase = new AddCartItemUseCase(
      mockCartRepository,
      mockProductRepository,
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
      mockProductRepository.findById.mockResolvedValue(
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
      expect(mockProductRepository.findById).toHaveBeenCalledWith(
        dto.productId,
      );
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
      expect(mockProductRepository.findById).not.toHaveBeenCalled();
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
      mockProductRepository.findById.mockResolvedValue(Result.failure(error));

      // Act
      const result = await usecase.execute({ cartId, dto });

      // Assert
      expect(mockProductRepository.findById).toHaveBeenCalledWith(
        dto.productId,
      );
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
      mockProductRepository.findById.mockResolvedValue(
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
