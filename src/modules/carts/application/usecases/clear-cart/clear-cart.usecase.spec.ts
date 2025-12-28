import { ClearCartUseCase } from './clear-cart.usecase';
import { MockCartRepository } from '../../../testing/mocks/cart-repository.mock';
import { Result } from '../../../../../core/domain/result';
import { Cart } from '../../../domain/entities/cart';
import { CartTestFactory } from '../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { RepositoryError } from '../../../../../core/errors/repository.error';

describe('ClearCartUseCase', () => {
  let usecase: ClearCartUseCase;
  let mockCartRepository: MockCartRepository;

  beforeEach(() => {
    mockCartRepository = new MockCartRepository();
    usecase = new ClearCartUseCase(mockCartRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    it('should clear cart successfully', async () => {
      // Arrange
      const cartId = 123;

      const mockCartData = CartTestFactory.createCartWithItems(3, {
        id: cartId,
      });
      const mockCart = Cart.fromPrimitives(mockCartData);

      const clearedCartData = CartTestFactory.createEmptyCart({ id: cartId });
      const clearedCart = Cart.fromPrimitives(clearedCartData);

      mockCartRepository.findById.mockResolvedValue(Result.success(mockCart));
      mockCartRepository.update.mockResolvedValue(Result.success(clearedCart));

      // Act
      const result = await usecase.execute(cartId);

      // Assert
      expect(mockCartRepository.findById).toHaveBeenCalledWith(cartId);
      expect(mockCartRepository.update).toHaveBeenCalled();
      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return failure when cart not found', async () => {
      // Arrange
      const cartId = 404;
      const error = new RepositoryError('Cart not found');

      mockCartRepository.findById.mockResolvedValue(Result.failure(error));

      // Act
      const result = await usecase.execute(cartId);

      // Assert
      expect(mockCartRepository.findById).toHaveBeenCalledWith(cartId);
      expect(mockCartRepository.update).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart not found',
        RepositoryError,
      );
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const cartId = 123;
      const error = new Error('Database connection failed');

      mockCartRepository.findById.mockRejectedValue(error);

      // Act
      const result = await usecase.execute(cartId);

      // Assert
      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected use case error',
        UseCaseError,
      );
    });
  });
});
