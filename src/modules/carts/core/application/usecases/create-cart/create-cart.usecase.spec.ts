import { CreateCartUseCase } from './create-cart.usecase';
import { MockCartRepository } from '../../../../testing/mocks/cart-repository.mock';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { Cart } from '../../../domain/entities/cart';
import { CartTestFactory } from '../../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('CreateCartUseCase', () => {
  let usecase: CreateCartUseCase;
  let mockCartRepository: MockCartRepository;

  const customerContext: CallerContext = {
    kind: 'user',
    userId: 123,
    role: 'CUSTOMER',
    permissions: new Set(['manage_own_cart']),
  };

  beforeEach(() => {
    mockCartRepository = new MockCartRepository();
    mockCartRepository.findByuserId.mockResolvedValue(
      Result.failure(new RepositoryError('Cart not found')),
    );
    usecase = new CreateCartUseCase(mockCartRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create a user cart successfully', async () => {
      mockCartRepository.mockSuccessfulSave();

      const result = await usecase.execute({ callerContext: customerContext });

      expect(mockCartRepository.save).toHaveBeenCalled();
      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return the existing cart if the user already has one', async () => {
      const mockCartData = CartTestFactory.createUserCart(123);
      const mockCart = Cart.fromPrimitives(mockCartData);

      mockCartRepository.findByuserId.mockResolvedValue(
        Result.success(mockCart),
      );

      const result = await usecase.execute({ callerContext: customerContext });

      expect(mockCartRepository.save).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should reject cart creation when callerContext is missing', async () => {
      const result = await usecase.execute({ callerContext: null });

      expect(mockCartRepository.save).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultFailure(
        result,
        'Not authorized to create a customer cart',
        UseCaseError,
      );
    });

    it('should reject customer cart creation when manage_own_cart permission is missing', async () => {
      const unscopedCustomer: CallerContext = {
        kind: 'user',
        userId: 1,
        role: 'CUSTOMER',
        permissions: new Set(),
      };

      const result = await usecase.execute({ callerContext: unscopedCustomer });

      expect(mockCartRepository.save).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultFailure(
        result,
        'Not authorized to create a customer cart',
        UseCaseError,
      );
    });

    it('should return failure when repository fails', async () => {
      mockCartRepository.mockSaveFailure('Failed to create cart');

      const result = await usecase.execute({ callerContext: customerContext });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to create cart',
        RepositoryError,
      );
    });
  });
});
