import { MergeCartsUseCase } from './merge-carts.usecase';
import { MockCartRepository } from '../../../../testing/mocks/cart-repository.mock';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { Cart } from '../../../domain/entities/cart';
import { CartTestFactory } from '../../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';

describe('MergeCartsUseCase', () => {
  let usecase: MergeCartsUseCase;
  let mockCartRepository: MockCartRepository;

  beforeEach(() => {
    mockCartRepository = new MockCartRepository();
    usecase = new MergeCartsUseCase(mockCartRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    it('should merge carts successfully', async () => {
      // Arrange
      const guestCartId = 123;
      const userCartId = 456;

      const guestCartData = CartTestFactory.createGuestCart(123, {
        id: guestCartId,
      });
      const guestCart = Cart.fromPrimitives(guestCartData);

      const userCartData = CartTestFactory.createUserCart(123, {
        id: userCartId,
      });
      const userCart = Cart.fromPrimitives(userCartData);

      const mergedCartData = CartTestFactory.createCartWithItems(3, {
        id: userCartId,
        customerId: 123,
      });
      const mergedCart = Cart.fromPrimitives(mergedCartData);

      mockCartRepository.findById
        .mockResolvedValueOnce(Result.success(guestCart))
        .mockResolvedValueOnce(Result.success(userCart));
      mockCartRepository.mergeCarts.mockResolvedValue(
        Result.success(mergedCart),
      );

      // Act
      const result = await usecase.execute({ guestCartId, userCartId });

      // Assert
      expect(mockCartRepository.findById).toHaveBeenCalledWith(guestCartId);
      expect(mockCartRepository.findById).toHaveBeenCalledWith(userCartId);
      expect(mockCartRepository.mergeCarts).toHaveBeenCalledWith(
        guestCart,
        userCart,
      );
      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return failure when guest cart not found', async () => {
      // Arrange
      const guestCartId = 404;
      const userCartId = 456;
      const error = new RepositoryError('Cart not found');

      mockCartRepository.findById.mockResolvedValue(Result.failure(error));

      // Act
      const result = await usecase.execute({ guestCartId, userCartId });

      // Assert
      expect(mockCartRepository.findById).toHaveBeenCalledWith(guestCartId);
      expect(mockCartRepository.mergeCarts).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart not found',
        RepositoryError,
      );
    });

    it('should return failure when user cart not found', async () => {
      // Arrange
      const guestCartId = 123;
      const userCartId = 404;

      const guestCartData = CartTestFactory.createGuestCart(123, {
        id: guestCartId,
      });
      const guestCart = Cart.fromPrimitives(guestCartData);
      const error = new RepositoryError('Cart not found');

      mockCartRepository.findById
        .mockResolvedValueOnce(Result.success(guestCart))
        .mockResolvedValueOnce(Result.failure(error));

      // Act
      const result = await usecase.execute({ guestCartId, userCartId });

      // Assert
      expect(mockCartRepository.findById).toHaveBeenCalledWith(userCartId);
      expect(mockCartRepository.mergeCarts).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart not found',
        RepositoryError,
      );
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const guestCartId = 123;
      const userCartId = 456;
      const error = new Error('Database connection failed');

      mockCartRepository.findById.mockRejectedValue(error);

      // Act
      const result = await usecase.execute({ guestCartId, userCartId });

      // Assert
      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected use case error',
        UseCaseError,
      );
    });
  });
});
