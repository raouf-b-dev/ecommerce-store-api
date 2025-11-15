import { CheckStockUseCase } from './check-stock.usecase';
import { MockInventoryRepository } from '../../testing/mocks/inventory-repository.mock';
import { InventoryTestFactory } from '../../testing/factories/inventory.test.factory';
import { ResultAssertionHelper } from '../../../../testing/helpers/result-assertion.helper';
import { Result } from '../../../../core/domain/result';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { UseCaseError } from '../../../../core/errors/usecase.error';
import { DomainError } from '../../../../core/errors/domain.error';
import { Inventory } from '../../domain/entities/inventory';

describe('CheckStockUseCase', () => {
  let usecase: CheckStockUseCase;
  let mockRepo: MockInventoryRepository;

  beforeEach(async () => {
    mockRepo = new MockInventoryRepository();
    usecase = new CheckStockUseCase(mockRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockRepo.reset();
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  it('should return available when stock is sufficient for a given quantity', async () => {
    // Arrange
    const productId = 'PR001';
    const requestedQuantity = 5;
    const mockInventory = InventoryTestFactory.createInStockInventory({
      productId,
      availableQuantity: 10,
    });

    // We must mock the domain entity that the repo returns
    const mockDomainInventory = Inventory.fromPrimitives(mockInventory);
    jest
      .spyOn(mockDomainInventory, 'isInStock')
      .mockReturnValue(Result.success(true));
    mockRepo.findByProductId.mockResolvedValue(
      Result.success(mockDomainInventory),
    );

    // Act
    const result = await usecase.execute({
      productId,
      quantity: requestedQuantity,
    });

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockRepo.findByProductId).toHaveBeenCalledWith(productId);
    expect(mockDomainInventory.isInStock).toHaveBeenCalledWith(
      requestedQuantity,
    );
    expect(result.value).toEqual({
      isAvailable: true,
      availableQuantity: 10,
      requestedQuantity: 5,
    });
  });

  it('should return available when stock is sufficient for default quantity (1)', async () => {
    // Arrange
    const productId = 'PR001';
    const mockInventory = InventoryTestFactory.createInStockInventory({
      productId,
      availableQuantity: 1,
    });

    const mockDomainInventory = Inventory.fromPrimitives(mockInventory);
    jest
      .spyOn(mockDomainInventory, 'isInStock')
      .mockReturnValue(Result.success(true));
    mockRepo.findByProductId.mockResolvedValue(
      Result.success(mockDomainInventory),
    );

    // Act
    const result = await usecase.execute({ productId }); // No quantity specified

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockRepo.findByProductId).toHaveBeenCalledWith(productId);
    expect(mockDomainInventory.isInStock).toHaveBeenCalledWith(1); // Default quantity
    expect(result.value).toEqual({
      isAvailable: true,
      availableQuantity: 1,
      requestedQuantity: 1,
    });
  });

  it('should return unavailable when stock is insufficient', async () => {
    // Arrange
    const productId = 'PR002';
    const requestedQuantity = 15;
    const mockInventory = InventoryTestFactory.createInStockInventory({
      productId,
      availableQuantity: 10,
    });

    const mockDomainInventory = Inventory.fromPrimitives(mockInventory);
    // Domain entity correctly reports false
    jest
      .spyOn(mockDomainInventory, 'isInStock')
      .mockReturnValue(Result.success(false));
    mockRepo.findByProductId.mockResolvedValue(
      Result.success(mockDomainInventory),
    );

    // Act
    const result = await usecase.execute({
      productId,
      quantity: requestedQuantity,
    });

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockRepo.findByProductId).toHaveBeenCalledWith(productId);
    expect(mockDomainInventory.isInStock).toHaveBeenCalledWith(
      requestedQuantity,
    );
    expect(result.value).toEqual({
      isAvailable: false,
      availableQuantity: 10,
      requestedQuantity: 15,
    });
  });

  it('should return a failure if the inventory is not found', async () => {
    // Arrange
    const productId = 'PR404';
    const repoError = ErrorFactory.RepositoryError('Inventory not found');
    mockRepo.findByProductId.mockResolvedValue(repoError);

    // Act
    const result = await usecase.execute({ productId, quantity: 1 });

    // Assert
    ResultAssertionHelper.assertResultFailureWithError(result, repoError.error);
    expect(mockRepo.findByProductId).toHaveBeenCalledWith(productId);
  });

  it('should return a failure if the domain check fails', async () => {
    // Arrange
    const productId = 'PR001';
    const requestedQuantity = -5; // Invalid quantity
    const mockInventory = InventoryTestFactory.createInStockInventory({
      productId,
      availableQuantity: 10,
    });

    const mockDomainInventory = Inventory.fromPrimitives(mockInventory);
    const domainError = ErrorFactory.DomainError('Quantity cannot be negative');
    jest.spyOn(mockDomainInventory, 'isInStock').mockReturnValue(domainError);
    mockRepo.findByProductId.mockResolvedValue(
      Result.success(mockDomainInventory),
    );

    // Act
    const result = await usecase.execute({
      productId,
      quantity: requestedQuantity,
    });

    // Assert
    ResultAssertionHelper.assertResultFailureWithError(
      result,
      domainError.error,
    );
    expect(mockDomainInventory.isInStock).toHaveBeenCalledWith(
      requestedQuantity,
    );
  });

  it('should return a use case error on unexpected repository exceptions', async () => {
    // Arrange
    const productId = 'PR500';
    const unexpectedError = new Error('Database connection failed');
    mockRepo.findByProductId.mockRejectedValue(unexpectedError);

    // Act
    const result = await usecase.execute({ productId, quantity: 1 });

    // Assert
    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected UseCase Error',
      UseCaseError,
      unexpectedError,
    );
  });
});
