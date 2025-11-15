import { CheckStockUseCase } from '../../../application/check-stock/check-stock.usecase';
import { CheckStockController } from './check-stock.controller';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { CheckStockResponse } from '../../dto/check-stock-response.dto';

describe('CheckStockController', () => {
  let usecase: jest.Mocked<CheckStockUseCase>;
  let controller: CheckStockController;

  beforeEach(async () => {
    usecase = {
      execute: jest.fn(),
    } as any;
    controller = new CheckStockController(usecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return stock availability on success (with quantity)', async () => {
    // Arrange
    const productId = 'PR001';
    const quantity = 5;
    const response: CheckStockResponse = {
      isAvailable: true,
      availableQuantity: 10,
      requestedQuantity: 5,
    };
    usecase.execute.mockResolvedValue(Result.success(response));

    // Act
    const result = await controller.handle(productId, quantity);

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(usecase.execute).toHaveBeenCalledWith({ productId, quantity });
    expect(result.value).toEqual(response);
  });

  it('should return stock availability on success (without quantity)', async () => {
    // Arrange
    const productId = 'PR001';
    const response: CheckStockResponse = {
      isAvailable: true,
      availableQuantity: 1,
      requestedQuantity: 1,
    };
    usecase.execute.mockResolvedValue(Result.success(response));

    // Act
    const result = await controller.handle(productId, undefined);

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(usecase.execute).toHaveBeenCalledWith({
      productId,
      quantity: undefined,
    });
    expect(result.value).toEqual(response);
  });

  it('should return a failure if the use case fails', async () => {
    // Arrange
    const productId = 'PR404';
    const quantity = 1;
    const useCaseError = ErrorFactory.UseCaseError('Inventory not found');
    usecase.execute.mockResolvedValue(useCaseError);

    // Act
    const result = await controller.handle(productId, quantity);

    // Assert
    ResultAssertionHelper.assertResultFailureWithError(
      result,
      useCaseError.error,
    );
    expect(usecase.execute).toHaveBeenCalledWith({ productId, quantity });
  });

  it('should return a controller error on unexpected exceptions', async () => {
    // Arrange
    const productId = 'PR500';
    const quantity = 1;
    const unexpectedError = new Error('Server exploded');
    usecase.execute.mockRejectedValue(unexpectedError);

    // Act
    const result = await controller.handle(productId, quantity);

    // Assert
    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected Controller Error',
      ControllerError,
      unexpectedError,
    );
    expect(usecase.execute).toHaveBeenCalledWith({ productId, quantity });
  });
});
