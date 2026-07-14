import { MergeCartsUseCase } from './merge-carts.usecase';
import { MockCartRepository } from '../../../../testing/mocks/cart-repository.mock';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { Cart } from '../../../domain/entities/cart';
import { CartTestFactory } from '../../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { CartOwnershipValidator } from '../../services/cart-ownership.validator';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { CartSessionTokenGateway } from '../../ports/session-token.gateway';

describe('MergeCartsUseCase', () => {
  let usecase: MergeCartsUseCase;
  let mockCartRepository: MockCartRepository;
  let validator: CartOwnershipValidator;
  let mockSessionTokenGateway: jest.Mocked<CartSessionTokenGateway>;

  const customerContext: CallerContext = {
    kind: 'user',
    userId: 123,
    role: 'CUSTOMER',
    permissions: new Set(['manage_own_cart']),
  };

  beforeEach(() => {
    mockCartRepository = new MockCartRepository();
    mockSessionTokenGateway = {
      generateToken: jest.fn(),
      validateToken: jest.fn().mockResolvedValue(true),
    } as any;
    validator = new CartOwnershipValidator(mockSessionTokenGateway);
    usecase = new MergeCartsUseCase(mockCartRepository, validator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should merge carts successfully', async () => {
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
        userId: 123,
      });
      const mergedCart = Cart.fromPrimitives(mergedCartData);

      mockCartRepository.findById
        .mockResolvedValueOnce(Result.success(guestCart))
        .mockResolvedValueOnce(Result.success(userCart));
      mockCartRepository.mergeCarts.mockResolvedValue(
        Result.success(mergedCart),
      );

      const result = await usecase.execute({
        guestCartId,
        userCartId,
        callerContext: customerContext,
        cartToken: 'mock-guest-token',
      });

      expect(mockCartRepository.findById).toHaveBeenCalledWith(guestCartId);
      expect(mockCartRepository.findById).toHaveBeenCalledWith(userCartId);
      expect(mockCartRepository.mergeCarts).toHaveBeenCalledWith(
        guestCart,
        userCart,
      );
      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return failure when guest cart not found', async () => {
      const guestCartId = 404;
      const userCartId = 456;
      const error = new RepositoryError('Cart not found');

      mockCartRepository.findById.mockResolvedValue(Result.failure(error));

      const result = await usecase.execute({
        guestCartId,
        userCartId,
        callerContext: customerContext,
        cartToken: 'mock-guest-token',
      });

      expect(mockCartRepository.findById).toHaveBeenCalledWith(guestCartId);
      expect(mockCartRepository.mergeCarts).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart not found',
        RepositoryError,
      );
    });

    it('should return failure when user cart not found', async () => {
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

      const result = await usecase.execute({
        guestCartId,
        userCartId,
        callerContext: customerContext,
        cartToken: 'mock-guest-token',
      });

      expect(mockCartRepository.findById).toHaveBeenCalledWith(userCartId);
      expect(mockCartRepository.mergeCarts).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart not found',
        RepositoryError,
      );
    });
    it('should return failure when guest cart token is missing during merge', async () => {
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

      mockCartRepository.findById
        .mockResolvedValueOnce(Result.success(guestCart))
        .mockResolvedValueOnce(Result.success(userCart));

      const result = await usecase.execute({
        guestCartId,
        userCartId,
        callerContext: customerContext,
        cartToken: null,
      });

      expect(mockCartRepository.mergeCarts).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultFailure(
        result,
        `Cart with id ${guestCartId} not found`,
        UseCaseError,
      );
    });
  });
});
