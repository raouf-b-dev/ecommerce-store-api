import { UpdateCartItemUseCase } from './update-cart-item.usecase';
import { MockCartRepository } from '../../../testing/mocks/cart-repository.mock';
import { Result } from '../../../../../core/domain/result';
import { Cart } from '../../../domain/entities/cart';
import { CartTestFactory } from '../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { UpdateCartItemDto } from '../../../presentation/dto/update-cart-item.dto';

describe('UpdateCartItemUseCase', () => {
  let usecase: UpdateCartItemUseCase;
  let mockCartRepository: MockCartRepository;
  let mockCheckStockUseCase: any;

  beforeEach(() => {
    mockCartRepository = new MockCartRepository();
    mockCheckStockUseCase = {
      execute: jest.fn(),
    };
    usecase = new UpdateCartItemUseCase(
      mockCartRepository,
      mockCheckStockUseCase,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    it('should update item quantity successfully', async () => {
      // Arrange
      const cartId = 'cart-123';
      const itemId = 'item-1';
      const dto: UpdateCartItemDto = { quantity: 5 };

      const mockCartData = CartTestFactory.createCartWithItems(2, {
        id: cartId,
      });
      const mockCart = Cart.fromPrimitives(mockCartData);

      mockCartRepository.findById.mockResolvedValue(Result.success(mockCart));
      mockCheckStockUseCase.execute.mockResolvedValue(
        Result.success({
          isAvailable: true,
          availableQuantity: 10,
          requestedQuantity: 5,
        }),
      );
      mockCartRepository.update.mockResolvedValue(Result.success(mockCart));

      // Act
      const result = await usecase.execute({ cartId, itemId, dto });

      // Assert
      expect(mockCartRepository.findById).toHaveBeenCalledWith(cartId);
      expect(mockCartRepository.update).toHaveBeenCalled();
      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return failure when cart not found', async () => {
      // Arrange
      const cartId = 'cart-404';
      const itemId = 'item-1';
      const dto: UpdateCartItemDto = { quantity: 2 };
      const error = new RepositoryError('Cart not found');

      mockCartRepository.findById.mockResolvedValue(Result.failure(error));

      // Act
      const result = await usecase.execute({ cartId, itemId, dto });

      // Assert
      expect(mockCartRepository.findById).toHaveBeenCalledWith(cartId);
      expect(mockCartRepository.update).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart not found',
        RepositoryError,
      );
    });

    it('should return failure when stock is insufficient', async () => {
      // Arrange
      const cartId = 'cart-123';
      const itemId = 'item-1';
      const dto: UpdateCartItemDto = { quantity: 20 };

      const mockCartData = CartTestFactory.createCartWithItems(2, {
        id: cartId,
      });
      const mockCart = Cart.fromPrimitives(mockCartData);

      mockCartRepository.findById.mockResolvedValue(Result.success(mockCart));
      mockCheckStockUseCase.execute.mockResolvedValue(
        Result.success({
          isAvailable: false,
          availableQuantity: 5,
          requestedQuantity: 20,
        }),
      );

      // Act
      const result = await usecase.execute({ cartId, itemId, dto });

      // Assert
      expect(mockCheckStockUseCase.execute).toHaveBeenCalledWith({
        productId: expect.any(String),
        quantity: dto.quantity,
      });
      ResultAssertionHelper.assertResultFailure(
        result,
        'Insufficient stock',
        UseCaseError,
      );
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const cartId = 'cart-123';
      const itemId = 'item-1';
      const dto: UpdateCartItemDto = { quantity: 2 };
      const error = new Error('Database connection failed');

      mockCartRepository.findById.mockRejectedValue(error);

      // Act
      const result = await usecase.execute({ cartId, itemId, dto });

      // Assert
      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected use case error',
        UseCaseError,
      );
    });
  });
});
