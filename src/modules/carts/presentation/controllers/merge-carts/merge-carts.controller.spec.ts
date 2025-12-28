import { MergeCartsUseCase } from '../../../application/usecases/merge-carts/merge-carts.usecase';
import { MergeCartsController } from './merge-carts.controller';
import { Result } from '../../../../../core/domain/result';
import { ICart } from '../../../domain/interfaces/cart.interface';
import { CartTestFactory } from '../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { UseCaseError } from '../../../../../core/errors/usecase.error';

describe('MergeCartsController', () => {
  let usecase: jest.Mocked<MergeCartsUseCase>;
  let controller: MergeCartsController;

  beforeEach(() => {
    usecase = {
      execute: jest.fn(),
    } as any;

    controller = new MergeCartsController(usecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handle', () => {
    it('should return success result with merged cart', async () => {
      // Arrange
      const guestCartId = 123;
      const userCartId = 456;
      const mockMergedCart: ICart = CartTestFactory.createCartWithItems(3, {
        id: userCartId,
        customerId: 123,
      });

      usecase.execute.mockResolvedValue(Result.success(mockMergedCart));

      // Act
      const result = await controller.handle(guestCartId, userCartId);

      // Assert
      expect(usecase.execute).toHaveBeenCalledWith({
        guestCartId,
        userCartId,
      });
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(mockMergedCart);
      expect(result.value.customerId).toBe(123);
    });

    it('should return failure when guest cart not found', async () => {
      // Arrange
      const guestCartId = 404;
      const userCartId = 456;
      const expectedError = new UseCaseError('Cart not found');

      usecase.execute.mockResolvedValue(Result.failure(expectedError));

      // Act
      const result = await controller.handle(guestCartId, userCartId);

      // Assert
      ResultAssertionHelper.assertResultFailure(result, 'Cart not found');
    });

    it('should return failure when user cart not found', async () => {
      // Arrange
      const guestCartId = 123;
      const userCartId = 404;
      const expectedError = new UseCaseError('Cart not found');

      usecase.execute.mockResolvedValue(Result.failure(expectedError));

      // Act
      const result = await controller.handle(guestCartId, userCartId);

      // Assert
      ResultAssertionHelper.assertResultFailure(result, 'Cart not found');
    });

    it('should catch unexpected exceptions and return a ControllerError', async () => {
      // Arrange
      const guestCartId = 123;
      const userCartId = 456;
      const unexpectedError = new Error('Database connection failed');

      usecase.execute.mockRejectedValue(unexpectedError);

      // Act
      const result = await controller.handle(guestCartId, userCartId);

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
