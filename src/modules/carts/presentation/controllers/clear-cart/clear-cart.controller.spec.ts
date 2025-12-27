import { ClearCartUseCase } from '../../../application/usecases/clear-cart/clear-cart.usecase';
import { ClearCartController } from './clear-cart.controller';
import { Result } from '../../../../../core/domain/result';
import { ICart } from '../../../domain/interfaces/cart.interface';
import { CartTestFactory } from '../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { UseCaseError } from '../../../../../core/errors/usecase.error';

describe('ClearCartController', () => {
  let usecase: jest.Mocked<ClearCartUseCase>;
  let controller: ClearCartController;

  beforeEach(() => {
    usecase = {
      execute: jest.fn(),
    } as any;

    controller = new ClearCartController(usecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handle', () => {
    it('should return success result with empty cart when cart is cleared', async () => {
      // Arrange
      const cartId = 123;
      const mockCart: ICart = CartTestFactory.createEmptyCart({ id: cartId });

      usecase.execute.mockResolvedValue(Result.success(mockCart));

      // Act
      const result = await controller.handle(cartId);

      // Assert
      expect(usecase.execute).toHaveBeenCalledWith(cartId);
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(mockCart);
      expect(result.value.items).toHaveLength(0);
      expect(result.value.itemCount).toBe(0);
    });

    it('should return failure when cart not found', async () => {
      // Arrange
      const cartId = 404;
      const expectedError = new UseCaseError('Cart not found');

      usecase.execute.mockResolvedValue(Result.failure(expectedError));

      // Act
      const result = await controller.handle(cartId);

      // Assert
      ResultAssertionHelper.assertResultFailure(result, 'Cart not found');
    });

    it('should catch unexpected exceptions and return a ControllerError', async () => {
      // Arrange
      const cartId = 123;
      const unexpectedError = new Error('Database connection failed');

      usecase.execute.mockRejectedValue(unexpectedError);

      // Act
      const result = await controller.handle(cartId);

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
