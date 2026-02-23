import { RemoveCartItemUseCase } from './remove-cart-item.usecase';
import { MockCartRepository } from '../../../../testing/mocks/cart-repository.mock';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { Cart } from '../../../domain/entities/cart';
import { CartTestFactory } from '../../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { UseCaseError } from '../../../../../../shared-kernel/errors/usecase.error';
import { RepositoryError } from '../../../../../../shared-kernel/errors/repository.error';

describe('RemoveCartItemUseCase', () => {
  let usecase: RemoveCartItemUseCase;
  let mockCartRepository: MockCartRepository;

  beforeEach(() => {
    mockCartRepository = new MockCartRepository();
    usecase = new RemoveCartItemUseCase(mockCartRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    it('should remove item from cart successfully', async () => {
      // Arrange
      const cartId = 123;
      const itemId = 1;

      const mockCartData = CartTestFactory.createCartWithItems(2, {
        id: cartId,
      });
      const mockCart = Cart.fromPrimitives(mockCartData);

      mockCartRepository.findById.mockResolvedValue(Result.success(mockCart));
      mockCartRepository.update.mockResolvedValue(Result.success(mockCart));

      // Act
      const result = await usecase.execute({ cartId, itemId });

      // Assert
      expect(mockCartRepository.findById).toHaveBeenCalledWith(cartId);
      expect(mockCartRepository.update).toHaveBeenCalled();
      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return failure when cart not found', async () => {
      // Arrange
      const cartId = 404;
      const itemId = 1;
      const error = new RepositoryError('Cart not found');

      mockCartRepository.findById.mockResolvedValue(Result.failure(error));

      // Act
      const result = await usecase.execute({ cartId, itemId });

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
      const itemId = 1;
      const error = new Error('Database connection failed');

      mockCartRepository.findById.mockRejectedValue(error);

      // Act
      const result = await usecase.execute({ cartId, itemId });

      // Assert
      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected use case error',
        UseCaseError,
      );
    });
  });
});
