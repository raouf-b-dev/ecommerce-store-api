import { UpdateCartItemUseCase } from '../../../application/usecases/update-cart-item/update-cart-item.usecase';
import { UpdateCartItemController } from './update-cart-item.controller';
import { Result } from '../../../../../core/domain/result';
import { ICart } from '../../../domain/interfaces/cart.interface';
import { CartTestFactory } from '../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { UpdateCartItemDto } from '../../dto/update-cart-item.dto';

describe('UpdateCartItemController', () => {
  let usecase: jest.Mocked<UpdateCartItemUseCase>;
  let controller: UpdateCartItemController;

  beforeEach(() => {
    usecase = {
      execute: jest.fn(),
    } as any;

    controller = new UpdateCartItemController(usecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handle', () => {
    it('should return success result with updated cart when quantity is updated', async () => {
      // Arrange
      const cartId = 'cart-123';
      const itemId = 'item-1';
      const dto: UpdateCartItemDto = { quantity: 5 };
      const mockCart: ICart = CartTestFactory.createCartWithItems(1, {
        id: cartId,
      });

      usecase.execute.mockResolvedValue(Result.success(mockCart));

      // Act
      const result = await controller.handle(cartId, itemId, dto);

      // Assert
      expect(usecase.execute).toHaveBeenCalledWith({ cartId, itemId, dto });
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(mockCart);
    });

    it('should return failure when cart not found', async () => {
      // Arrange
      const cartId = 'cart-404';
      const itemId = 'item-1';
      const dto: UpdateCartItemDto = { quantity: 2 };
      const expectedError = new UseCaseError('Cart not found');

      usecase.execute.mockResolvedValue(Result.failure(expectedError));

      // Act
      const result = await controller.handle(cartId, itemId, dto);

      // Assert
      ResultAssertionHelper.assertResultFailure(result, 'Cart not found');
    });

    it('should return failure when item not found in cart', async () => {
      // Arrange
      const cartId = 'cart-123';
      const itemId = 'item-404';
      const dto: UpdateCartItemDto = { quantity: 2 };
      const expectedError = new UseCaseError('Item not found in cart');

      usecase.execute.mockResolvedValue(Result.failure(expectedError));

      // Act
      const result = await controller.handle(cartId, itemId, dto);

      // Assert
      ResultAssertionHelper.assertResultFailure(
        result,
        'Item not found in cart',
      );
    });

    it('should catch unexpected exceptions and return a ControllerError', async () => {
      // Arrange
      const cartId = 'cart-123';
      const itemId = 'item-1';
      const dto: UpdateCartItemDto = { quantity: 2 };
      const unexpectedError = new Error('Database connection failed');

      usecase.execute.mockRejectedValue(unexpectedError);

      // Act
      const result = await controller.handle(cartId, itemId, dto);

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
