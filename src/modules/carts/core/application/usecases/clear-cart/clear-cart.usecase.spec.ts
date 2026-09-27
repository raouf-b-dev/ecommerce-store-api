import { ClearCartUseCase } from './clear-cart.usecase';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { CartOwnershipValidator } from '../../services/cart-ownership.validator';
import { AuthPayloadFactory } from 'src/testing/factories/auth-payload.factory';
import { CartTestFactory, MockCartRepository } from 'src/modules/carts/testing';

describe('ClearCartUseCase', () => {
  let usecase: ClearCartUseCase;
  let mockCartRepository: MockCartRepository;
  let validator: CartOwnershipValidator;

  const customerContext = AuthPayloadFactory.createCustomerContext();

  beforeEach(() => {
    mockCartRepository = new MockCartRepository();
    validator = new CartOwnershipValidator();
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
        userId: 123,
      });

      mockCartRepository.mockSuccessfulFind(mockCartData);
      mockCartRepository.mockSuccessfulSave();

      const result = await usecase.execute({
        cartId,
        callerContext: customerContext,
      });

      expect(mockCartRepository.findByIdForUpdate).toHaveBeenCalledWith(cartId);
      expect(mockCartRepository.save).toHaveBeenCalled();
      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return failure when cart not found', async () => {
      const cartId = 404;

      mockCartRepository.mockCartNotFound(String(cartId));

      const result = await usecase.execute({
        cartId,
        callerContext: customerContext,
      });

      expect(mockCartRepository.findByIdForUpdate).toHaveBeenCalledWith(cartId);
      expect(mockCartRepository.save).not.toHaveBeenCalled();
      ResultAssertionHelper.assertResultFailure(
        result,
        `Cart with id ${cartId} not found`,
        RepositoryError,
      );
    });
  });
});
