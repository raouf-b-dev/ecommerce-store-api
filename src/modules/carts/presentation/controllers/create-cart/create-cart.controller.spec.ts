import { CreateCartUseCase } from '../../../application/usecases/create-cart/create-cart.usecase';
import { CreateCartController } from './create-cart.controller';
import { Result } from '../../../../../core/domain/result';
import { ICart } from '../../../domain/interfaces/cart.interface';
import { CartTestFactory } from '../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { CreateCartDto } from '../../dto/create-cart.dto';

describe('CreateCartController', () => {
  let usecase: jest.Mocked<CreateCartUseCase>;
  let controller: CreateCartController;

  beforeEach(() => {
    usecase = {
      execute: jest.fn(),
    } as any;

    controller = new CreateCartController(usecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handle', () => {
    it('should return success result with cart when use case succeeds', async () => {
      // Arrange
      const dto: CreateCartDto = { customerId: 123 };
      const mockCart: ICart = CartTestFactory.createUserCart(123);

      usecase.execute.mockResolvedValue(Result.success(mockCart));

      // Act
      const result = await controller.handle(dto);

      // Assert
      expect(usecase.execute).toHaveBeenCalledWith(dto);
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(mockCart);
    });

    it('should create a guest cart when sessionId is provided', async () => {
      // Arrange
      const dto: CreateCartDto = { sessionId: 456 };
      const mockCart: ICart = CartTestFactory.createGuestCart(456);

      usecase.execute.mockResolvedValue(Result.success(mockCart));

      // Act
      const result = await controller.handle(dto);

      // Assert
      expect(usecase.execute).toHaveBeenCalledWith(dto);
      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.sessionId).toBe(456);
    });

    it('should return the specific failure result when use case fails', async () => {
      // Arrange
      const dto: CreateCartDto = { customerId: 123 };
      const expectedError = new UseCaseError('Failed to create cart');

      usecase.execute.mockResolvedValue(Result.failure(expectedError));

      // Act
      const result = await controller.handle(dto);

      // Assert
      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to create cart',
      );
    });

    it('should catch unexpected exceptions and return a ControllerError', async () => {
      // Arrange
      const dto: CreateCartDto = { customerId: 123 };
      const unexpectedError = new Error('Database connection failed');

      usecase.execute.mockRejectedValue(unexpectedError);

      // Act
      const result = await controller.handle(dto);

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
