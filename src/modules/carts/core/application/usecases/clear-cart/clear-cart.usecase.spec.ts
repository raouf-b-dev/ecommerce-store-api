import { ClearCartUseCase } from './clear-cart.usecase';
import { MockCartRepository } from '../../../../testing/mocks/cart-repository.mock';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { Cart } from '../../../domain/entities/cart';
import { CartTestFactory } from '../../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { CartOwnershipValidator } from '../../services/cart-ownership.validator';
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('ClearCartUseCase', () => {
  let usecase: ClearCartUseCase;
  let mockCartRepository: MockCartRepository;
  let validator: CartOwnershipValidator;
  let mockTokenService: any;

  const customerContext: CallerContext = {
    kind: 'user',
    userId: 2,
    customerId: 123,
    role: 'CUSTOMER',
    permissions: new Set(['manage_own_cart']),
  };

  beforeEach(() => {
    mockCartRepository = new MockCartRepository();
    mockTokenService = {
      validateToken: jest.fn().mockResolvedValue(true),
    };
    validator = new CartOwnershipValidator(mockTokenService);
    usecase = new ClearCartUseCase(mockCartRepository, validator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should clear cart successfully', async () => {
      const cartId = 123;

      const mockCartData = CartTestFactory.createCartWithItems(3, {
        id: cartId,
        customerId: 123,
      });
      const mockCart = Cart.fromPrimitives(mockCartData);

      const clearedCartData = CartTestFactory.createEmptyCart({ id: cartId });
      const clearedCart = Cart.fromPrimitives(clearedCartData);

      mockCartRepository.findById.mockResolvedValue(Result.success(mockCart));
      mockCartRepository.update.mockResolvedValue(Result.success(clearedCart));

      const result = await usecase.execute({
        cartId,
        callerContext: customerContext,
        cartToken: null,
      });

      expect(mockCartRepository.findById).toHaveBeenCalledWith(cartId);
      expect(mockCartRepository.update).toHaveBeenCalled();
      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return failure when cart not found', async () => {
      const cartId = 404;
      const error = new RepositoryError('Cart not found');

      mockCartRepository.findById.mockResolvedValue(Result.failure(error));

      const result = await usecase.execute({
        cartId,
        callerContext: customerContext,
        cartToken: null,
      });

      expect(mockCartRepository.findById).toHaveBeenCalledWith(cartId);
      expect(mockCartRepository.update).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart not found',
        RepositoryError,
      );
    });
  });
});
