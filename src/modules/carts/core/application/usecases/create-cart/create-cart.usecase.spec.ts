import { CreateCartUseCase } from './create-cart.usecase';
import { MockCartRepository } from '../../../../testing/mocks/cart-repository.mock';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { Cart } from '../../../domain/entities/cart';
import { CartTestFactory } from '../../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { UseCaseError } from '../../../../../../shared-kernel/errors/usecase.error';
import { RepositoryError } from '../../../../../../shared-kernel/errors/repository.error';
import { CreateCartDto } from '../../../../primary-adapters/dto/create-cart.dto';

describe('CreateCartUseCase', () => {
  let usecase: CreateCartUseCase;
  let mockCartRepository: MockCartRepository;

  beforeEach(() => {
    mockCartRepository = new MockCartRepository();
    usecase = new CreateCartUseCase(mockCartRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    it('should create a user cart successfully', async () => {
      // Arrange
      const dto: CreateCartDto = { customerId: 123 };
      const mockCartData = CartTestFactory.createUserCart(123);
      const mockCart = Cart.fromPrimitives(mockCartData);

      mockCartRepository.create.mockResolvedValue(Result.success(mockCart));

      // Act
      const result = await usecase.execute(dto);

      // Assert
      expect(mockCartRepository.create).toHaveBeenCalledWith(dto);
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.customerId).toBe(123);
      expect(result.value.sessionId).toBeNull();
    });

    it('should create a guest cart successfully', async () => {
      // Arrange
      const dto: CreateCartDto = { sessionId: 456 };
      const mockCartData = CartTestFactory.createGuestCart(456);
      const mockCart = Cart.fromPrimitives(mockCartData);

      mockCartRepository.create.mockResolvedValue(Result.success(mockCart));

      // Act
      const result = await usecase.execute(dto);

      // Assert
      expect(mockCartRepository.create).toHaveBeenCalledWith(dto);
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.sessionId).toBe(456);
      expect(result.value.customerId).toBeNull();
    });

    it('should return failure when repository fails', async () => {
      // Arrange
      const dto: CreateCartDto = { customerId: 123 };
      const error = new RepositoryError('Failed to create cart');

      mockCartRepository.create.mockResolvedValue(Result.failure(error));

      // Act
      const result = await usecase.execute(dto);

      // Assert
      expect(mockCartRepository.create).toHaveBeenCalledWith(dto);
      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to create cart',
        RepositoryError,
      );
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const dto: CreateCartDto = { customerId: 123 };
      const error = new Error('Database connection failed');

      mockCartRepository.create.mockRejectedValue(error);

      // Act
      const result = await usecase.execute(dto);

      // Assert
      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected use case error',
        UseCaseError,
      );
    });
  });
});
