import { RemoveCartItemUseCase } from '../../../application/usecases/remove-cart-item/remove-cart-item.usecase';
import { RemoveCartItemController } from './remove-cart-item.controller';
import { Result } from '../../../../../core/domain/result';
import { ICart } from '../../../domain/interfaces/cart.interface';
import { CartTestFactory } from '../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { UseCaseError } from '../../../../../core/errors/usecase.error';

describe('RemoveCartItemController', () => {
  let usecase: jest.Mocked<RemoveCartItemUseCase>;
  let controller: RemoveCartItemController;

  beforeEach(() => {
    usecase = {
      execute: jest.fn(),
    } as any;

    controller = new RemoveCartItemController(usecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handle', () => {
    it('should return success result with updated cart when item is removed', async () => {
      // Arrange
      const cartId = 123;
      const itemId = 1;
      const mockCart: ICart = CartTestFactory.createCartWithItems(2, {
        id: cartId,
      });

      usecase.execute.mockResolvedValue(Result.success(mockCart));

      // Act
      const result = await controller.handle(cartId, itemId);

      // Assert
      expect(usecase.execute).toHaveBeenCalledWith({ cartId, itemId });
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(mockCart);
    });

    it('should return failure when cart not found', async () => {
      // Arrange
      const cartId = 404;
      const itemId = 1;
      const expectedError = new UseCaseError('Cart not found');

      usecase.execute.mockResolvedValue(Result.failure(expectedError));

      // Act
      const result = await controller.handle(cartId, itemId);

      // Assert
      ResultAssertionHelper.assertResultFailure(result, 'Cart not found');
    });

    it('should return failure when item not found in cart', async () => {
      // Arrange
      const cartId = 123;
      const itemId = 404;
      const expectedError = new UseCaseError('Item not found in cart');

      usecase.execute.mockResolvedValue(Result.failure(expectedError));

      // Act
      const result = await controller.handle(cartId, itemId);

      // Assert
      ResultAssertionHelper.assertResultFailure(
        result,
        'Item not found in cart',
      );
    });

    it('should catch unexpected exceptions and return a ControllerError', async () => {
      // Arrange
      const cartId = 123;
      const itemId = 1;
      const unexpectedError = new Error('Database connection failed');

      usecase.execute.mockRejectedValue(unexpectedError);

      // Act
      const result = await controller.handle(cartId, itemId);

      // Assert
      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected Controller Error',
        ControllerError,
        unexpectedError,
      );
    });
  });
});
