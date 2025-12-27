import { GetCartUseCase } from '../../../application/usecases/get-cart/get-cart.usecase';
import { GetCartController } from './get-cart.controller';
import { Result } from '../../../../../core/domain/result';
import { ICart } from '../../../domain/interfaces/cart.interface';
import { CartTestFactory } from '../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { UseCaseError } from '../../../../../core/errors/usecase.error';

describe('GetCartController', () => {
  let usecase: jest.Mocked<GetCartUseCase>;
  let controller: GetCartController;

  beforeEach(() => {
    usecase = {
      execute: jest.fn(),
    } as any;

    controller = new GetCartController(usecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return the cart on success', async () => {
    // Arrange
    const cartId = 123;
    const mockCart: ICart = CartTestFactory.createMockCart({ id: cartId });

    usecase.execute.mockResolvedValue(Result.success(mockCart));

    // Act
    const result = await controller.handle(cartId);

    // Assert
    expect(usecase.execute).toHaveBeenCalledWith(cartId);
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual(mockCart);
  });

  it('should return a failure result if the use case fails', async () => {
    // Arrange
    const cartId = 404;
    const mockError = new UseCaseError('Cart not found');

    usecase.execute.mockResolvedValue(Result.failure(mockError));

    // Act
    const result = await controller.handle(cartId);

    // Assert
    expect(usecase.execute).toHaveBeenCalledWith(cartId);
    ResultAssertionHelper.assertResultFailureWithError(result, mockError);
  });

  it('should return a ControllerError on unexpected exceptions', async () => {
    // Arrange
    const cartId = 500;
    const mockError = new Error('Database connection failed');

    usecase.execute.mockRejectedValue(mockError);

    // Act
    const result = await controller.handle(cartId);

    // Assert
    expect(usecase.execute).toHaveBeenCalledWith(cartId);
    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected Controller Error',
      ControllerError,
      mockError,
    );
  });
});
