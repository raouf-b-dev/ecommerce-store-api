import { CreateCartUseCase } from './create-cart.usecase';
import { MockCartRepository } from '../../../../testing/mocks/cart-repository.mock';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { Cart } from '../../../domain/entities/cart';
import { CartTestFactory } from '../../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { CartSessionTokenService } from '../../../../../auth/core/application/services/cart-session-token.service';

describe('CreateCartUseCase', () => {
  let usecase: CreateCartUseCase;
  let mockCartRepository: MockCartRepository;
  let mockTokenService: jest.Mocked<CartSessionTokenService>;

  const customerContext: CallerContext = {
    kind: 'user',
    userId: 1,
    customerId: 123,
    role: 'CUSTOMER',
    permissions: new Set(['manage_own_cart']),
  };

  beforeEach(() => {
    mockCartRepository = new MockCartRepository();
    mockTokenService = {
      generateToken: jest.fn().mockResolvedValue('mock-session-token'),
      validateToken: jest.fn(),
    } as any;

    usecase = new CreateCartUseCase(mockCartRepository, mockTokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create a user cart successfully', async () => {
      const mockCartData = CartTestFactory.createUserCart(123);
      const mockCart = Cart.fromPrimitives(mockCartData);
      Object.defineProperty(mockCart, 'id', { value: 777 });

      mockCartRepository.create.mockResolvedValue(Result.success(mockCart));

      const result = await usecase.execute({ callerContext: customerContext });

      expect(mockCartRepository.create).toHaveBeenCalledWith({
        customerId: 123,
      });
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.cart.customerId).toBe(123);
      expect(result.value.token).toBeUndefined();
    });

    it('should create a guest cart and return session token for anonymous callers', async () => {
      const mockCartData = CartTestFactory.createGuestCart(456);
      const mockCart = Cart.fromPrimitives(mockCartData);
      Object.defineProperty(mockCart, 'id', { value: 777 });

      mockCartRepository.create.mockResolvedValue(Result.success(mockCart));

      const result = await usecase.execute({ callerContext: null });

      expect(mockCartRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: expect.any(Number),
        }),
      );
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.cart.sessionId).toBe(456);
      expect(result.value.token).toBe('mock-session-token');
      expect(mockTokenService.generateToken).toHaveBeenCalledWith(777);
    });

    it('should create a guest cart for authenticated callers without a customer profile', async () => {
      const adminContext: CallerContext = {
        kind: 'user',
        userId: 1,
        customerId: null,
        role: 'ADMIN',
        permissions: new Set(['manage_carts']),
      };

      const mockCartData = CartTestFactory.createGuestCart(456);
      const mockCart = Cart.fromPrimitives(mockCartData);
      Object.defineProperty(mockCart, 'id', { value: 777 });

      mockCartRepository.create.mockResolvedValue(Result.success(mockCart));

      const result = await usecase.execute({ callerContext: adminContext });

      expect(mockCartRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: expect.any(Number),
        }),
      );
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.token).toBe('mock-session-token');
    });

    it('should reject customer cart creation when manage_own_cart permission is missing', async () => {
      const unscopedCustomer: CallerContext = {
        kind: 'user',
        userId: 1,
        customerId: 123,
        role: 'CUSTOMER',
        permissions: new Set(),
      };

      const result = await usecase.execute({ callerContext: unscopedCustomer });

      expect(mockCartRepository.create).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultFailure(
        result,
        'Not authorized to create a customer cart',
        UseCaseError,
      );
    });

    it('should return failure when repository fails', async () => {
      const error = new RepositoryError('Failed to create cart');
      mockCartRepository.create.mockResolvedValue(Result.failure(error));

      const result = await usecase.execute({ callerContext: customerContext });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to create cart',
        RepositoryError,
      );
    });
  });
});
