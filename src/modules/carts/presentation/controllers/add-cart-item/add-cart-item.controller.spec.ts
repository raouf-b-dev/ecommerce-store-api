import { AddCartItemUseCase } from '../../../application/usecases/add-cart-item/add-cart-item.usecase';
import { AddCartItemController } from './add-cart-item.controller';
import { Result } from '../../../../../core/domain/result';
import { ICart } from '../../../domain/interfaces/cart.interface';
import { CartTestFactory } from '../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { AddCartItemDto } from '../../dto/add-cart-item.dto';

describe('AddCartItemController', () => {
  let usecase: jest.Mocked<AddCartItemUseCase>;
  let controller: AddCartItemController;

  beforeEach(() => {
    usecase = {
      execute: jest.fn(),
    } as any;

    controller = new AddCartItemController(usecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handle', () => {
    it('should return success result with updated cart when use case succeeds', async () => {
      // Arrange
      const cartId = 123;
      const dto: AddCartItemDto = {
        productId: 1,
        quantity: 2,
      };
      const mockCart: ICart = CartTestFactory.createCartWithItems(1, {
        id: cartId,
      });

      usecase.execute.mockResolvedValue(Result.success(mockCart));

      // Act
      const result = await controller.handle(cartId, dto);

      // Assert
      expect(usecase.execute).toHaveBeenCalledWith({ cartId, dto });
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(mockCart);
    });

    it('should return failure when product not found', async () => {
      // Arrange
      const cartId = 123;
      const dto: AddCartItemDto = {
        productId: 404,
        quantity: 1,
      };
      const expectedError = new UseCaseError('Product not found');

      usecase.execute.mockResolvedValue(Result.failure(expectedError));

      // Act
      const result = await controller.handle(cartId, dto);

      // Assert
      ResultAssertionHelper.assertResultFailure(result, 'Product not found');
    });

    it('should return failure when cart not found', async () => {
      // Arrange
      const cartId = 404;
      const dto: AddCartItemDto = {
        productId: 1,
        quantity: 1,
      };
      const expectedError = new UseCaseError('Cart not found');

      usecase.execute.mockResolvedValue(Result.failure(expectedError));

      // Act
      const result = await controller.handle(cartId, dto);

      // Assert
      ResultAssertionHelper.assertResultFailure(result, 'Cart not found');
    });

    it('should catch unexpected exceptions and return a ControllerError', async () => {
      // Arrange
      const cartId = 123;
      const dto: AddCartItemDto = {
        productId: 1,
        quantity: 1,
      };
      const unexpectedError = new Error('Database connection failed');

      usecase.execute.mockRejectedValue(unexpectedError);

      // Act
      const result = await controller.handle(cartId, dto);

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
