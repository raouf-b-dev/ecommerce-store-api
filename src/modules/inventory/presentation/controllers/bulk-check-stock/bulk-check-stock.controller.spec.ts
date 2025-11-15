import { BulkCheckStockUseCase } from '../../../application/bulk-check-stock/bulk-check-stock.usecase';
import { BulkCheckStockController } from './bulk-check-stock.controller';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { CheckStockResponse } from '../../dto/check-stock-response.dto';

describe('BulkCheckStockController', () => {
  let usecase: jest.Mocked<BulkCheckStockUseCase>;
  let controller: BulkCheckStockController;

  beforeEach(async () => {
    usecase = {
      execute: jest.fn(),
    } as any;
    controller = new BulkCheckStockController(usecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return the bulk stock check response on successful execution', async () => {
    // Arrange
    const input = [
      { productId: 'PR1', quantity: 1 },
      { productId: 'PR2', quantity: 10 },
    ];
    const expectedResponse: CheckStockResponse[] = [
      { isAvailable: true, availableQuantity: 10, requestedQuantity: 1 },
      { isAvailable: false, availableQuantity: 5, requestedQuantity: 10 },
    ];
    usecase.execute.mockResolvedValue(Result.success(expectedResponse));

    // Act
    const result = await controller.handle(input);

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(usecase.execute).toHaveBeenCalledWith(input);
    expect(result.value).toEqual(expectedResponse);
  });

  it('should return an empty array response when provided an empty input array', async () => {
    // Arrange
    const input: { productId: string; quantity?: number }[] = [];
    const expectedResponse: CheckStockResponse[] = [];
    usecase.execute.mockResolvedValue(Result.success(expectedResponse));

    // Act
    const result = await controller.handle(input);

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(usecase.execute).toHaveBeenCalledWith(input);
    expect(result.value).toEqual(expectedResponse);
  });

  it('should return a failure if the use case fails', async () => {
    // Arrange
    const input = [{ productId: 'PR404', quantity: 1 }];
    const useCaseError = ErrorFactory.UseCaseError('Repository failed');
    usecase.execute.mockResolvedValue(useCaseError);

    // Act
    const result = await controller.handle(input);

    // Assert
    ResultAssertionHelper.assertResultFailureWithError(
      result,
      useCaseError.error,
    );
    expect(usecase.execute).toHaveBeenCalledWith(input);
  });

  it('should return a controller error on unexpected exceptions', async () => {
    // Arrange
    const input = [{ productId: 'PR500', quantity: 1 }];
    const unexpectedError = new Error('Unexpected runtime crash');
    usecase.execute.mockRejectedValue(unexpectedError);

    // Act
    const result = await controller.handle(input);

    // Assert
    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected Controller Error',
      ControllerError,
      unexpectedError,
    );
    expect(usecase.execute).toHaveBeenCalledWith(input);
  });
});
