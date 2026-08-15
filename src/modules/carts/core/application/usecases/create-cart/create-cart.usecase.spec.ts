import { CreateCartUseCase } from './create-cart.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { Cart } from '../../../domain/entities/cart';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { createUserCallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { AuthPayloadFactory } from 'src/testing/factories/auth-payload.factory';
import { CartTestFactory, MockCartRepository } from 'src/modules/carts/testing';

describe('CreateCartUseCase', () => {
  let usecase: CreateCartUseCase;
  let mockCartRepository: MockCartRepository;

  const customerContext = AuthPayloadFactory.createCustomerContext();

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
      mockCartRepository.save.mockImplementation((cart: Cart) => {
        cart.setId(42);
        return Promise.resolve(Result.success(cart));
      });

      const result = await usecase.execute(customerContext);

      expect(mockCartRepository.save).toHaveBeenCalled();
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(42);
      expect(result.value.userId).toBe(123);
      expect(result.value.items).toEqual([]);
      expect(result.value.itemCount).toBe(0);
    });

    it('should return the existing cart if the user already has one', async () => {
      const mockCart = CartTestFactory.createUserCart(123, { id: 42 });

      mockCartRepository.findByuserId.mockResolvedValue(
        Result.success(mockCart),
      );

      const result = await usecase.execute(customerContext);

      expect(mockCartRepository.save).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(42);
      expect(result.value.items).toEqual([]);
    });

    it('should fail closed when the persisted cart has no id', async () => {
      mockCartRepository.save.mockImplementation((cart: Cart) =>
        Promise.resolve(Result.success(cart)),
      );

      const result = await usecase.execute(customerContext);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart for user 123 not found after persist',
        UseCaseError,
      );
    });

    it('should reject cart creation when callerContext is missing', async () => {
      const result = await usecase.execute(null);

      expect(mockCartRepository.save).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultFailure(
        result,
        'Not authorized to create a customer cart',
        UseCaseError,
      );
    });

    it('should reject customer cart creation when manage_own_cart permission is missing', async () => {
      const unscopedCustomer = createUserCallerContext({
        userId: 1,
        role: 'CUSTOMER',
        permissions: new Set(),
      });

      const result = await usecase.execute(unscopedCustomer);

      expect(mockCartRepository.save).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultFailure(
        result,
        'Not authorized to create a customer cart',
        UseCaseError,
      );
    });

    it('should return failure when repository fails', async () => {
      mockCartRepository.mockSaveFailure('Failed to create cart');

      const result = await usecase.execute(customerContext);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to create cart',
        RepositoryError,
      );
    });
  });
});
