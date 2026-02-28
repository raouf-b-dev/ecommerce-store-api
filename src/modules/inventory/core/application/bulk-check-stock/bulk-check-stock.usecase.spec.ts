import { BulkCheckStockUseCase } from './bulk-check-stock.usecase';
import { MockInventoryRepository } from '../../../testing/mocks/inventory-repository.mock';
import { InventoryTestFactory } from '../../../testing/factories/inventory.test.factory';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Inventory } from '../../domain/entities/inventory';
import { CheckStockResponse } from '../../../primary-adapters/dto/check-stock-response.dto';

describe('BulkCheckStockUseCase', () => {
  let usecase: BulkCheckStockUseCase;
  let mockRepo: MockInventoryRepository;

  beforeEach(async () => {
    mockRepo = new MockInventoryRepository();
    usecase = new BulkCheckStockUseCase(mockRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockRepo.reset();
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  it('should return available for all items when stock is sufficient', async () => {
    // Arrange
    const input = [
      { productId: 1, quantity: 5 },
      { productId: 2, quantity: 20 },
    ];

    const inv1Primitives = InventoryTestFactory.createInStockInventory({
      productId: 1,
      availableQuantity: 10,
    });
    const inv2Primitives = InventoryTestFactory.createInStockInventory({
      productId: 2,
      availableQuantity: 30,
    });

    const inv1Domain = Inventory.fromPrimitives(inv1Primitives);
    const inv2Domain = Inventory.fromPrimitives(inv2Primitives);

    jest.spyOn(inv1Domain, 'isInStock').mockReturnValue(Result.success(true));
    jest.spyOn(inv2Domain, 'isInStock').mockReturnValue(Result.success(true));

    mockRepo.findByProductIds.mockResolvedValue(
      Result.success([inv1Domain, inv2Domain]),
    );

    // Act
    const result = await usecase.execute(input);

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockRepo.findByProductIds).toHaveBeenCalledWith([1, 2]);

    const expected: CheckStockResponse[] = [
      { isAvailable: true, availableQuantity: 10, requestedQuantity: 5 },
      { isAvailable: true, availableQuantity: 30, requestedQuantity: 20 },
    ];
    expect(result.value).toEqual(expected);
  });

  it('should handle mixed availability (available, unavailable, and default quantity)', async () => {
    // Arrange
    const input = [
      { productId: 1, quantity: 5 },
      { productId: 2, quantity: 30 },
      { productId: 3 },
    ];

    const inv1Primitives = InventoryTestFactory.createInStockInventory({
      productId: 1,
      availableQuantity: 10,
    });
    const inv2Primitives = InventoryTestFactory.createInStockInventory({
      productId: 2,
      availableQuantity: 20,
    });
    const inv3Primitives = InventoryTestFactory.createInStockInventory({
      productId: 3,
      availableQuantity: 5,
    });

    const inv1Domain = Inventory.fromPrimitives(inv1Primitives);
    const inv2Domain = Inventory.fromPrimitives(inv2Primitives);
    const inv3Domain = Inventory.fromPrimitives(inv3Primitives);

    jest
      .spyOn(inv1Domain, 'isInStock')
      .mockImplementation(() => Result.success(true));
    jest
      .spyOn(inv2Domain, 'isInStock')
      .mockImplementation(() => Result.success(false));
    jest
      .spyOn(inv3Domain, 'isInStock')
      .mockImplementation(() => Result.success(true));

    mockRepo.findByProductIds.mockResolvedValue(
      Result.success([inv1Domain, inv2Domain, inv3Domain]),
    );

    // Act
    const result = await usecase.execute(input);

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    const expected: CheckStockResponse[] = [
      { isAvailable: true, availableQuantity: 10, requestedQuantity: 5 },
      { isAvailable: false, availableQuantity: 20, requestedQuantity: 30 },
      { isAvailable: true, availableQuantity: 5, requestedQuantity: 1 },
    ];
    expect(result.value).toEqual(expected);
  });

  it('should handle missing inventory records correctly', async () => {
    // Arrange
    const input = [
      { productId: 1, quantity: 5 },
      { productId: 999, quantity: 10 },
    ];

    const inv1Primitives = InventoryTestFactory.createInStockInventory({
      productId: 1,
      availableQuantity: 10,
    });
    const inv1Domain = Inventory.fromPrimitives(inv1Primitives);
    jest.spyOn(inv1Domain, 'isInStock').mockReturnValue(Result.success(true));

    mockRepo.findByProductIds.mockResolvedValue(Result.success([inv1Domain]));

    // Act
    const result = await usecase.execute(input);

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockRepo.findByProductIds).toHaveBeenCalledWith([1, 999]);

    const expected: CheckStockResponse[] = [
      { isAvailable: true, availableQuantity: 10, requestedQuantity: 5 },
      { isAvailable: false, availableQuantity: 0, requestedQuantity: 10 },
    ];
    expect(result.value).toEqual(expected);
  });

  it('should handle duplicate productIds in input DTO and call repo once', async () => {
    // Arrange
    const input = [
      { productId: 1, quantity: 1 },
      { productId: 2, quantity: 10 },
      { productId: 1, quantity: 5 },
    ];

    const inv1Primitives = InventoryTestFactory.createInStockInventory({
      productId: 1,
      availableQuantity: 10,
    });
    const inv2Primitives = InventoryTestFactory.createLowStockInventory({
      productId: 2,
      availableQuantity: 5,
    });

    const inv1Domain = Inventory.fromPrimitives(inv1Primitives);
    const inv2Domain = Inventory.fromPrimitives(inv2Primitives);

    jest
      .spyOn(inv1Domain, 'isInStock')
      .mockImplementation((q = 1) =>
        Result.success(q <= inv1Domain.availableQuantity),
      );
    jest
      .spyOn(inv2Domain, 'isInStock')
      .mockImplementation((q = 1) =>
        Result.success(q <= inv2Domain.availableQuantity),
      );

    mockRepo.findByProductIds.mockResolvedValue(
      Result.success([inv1Domain, inv2Domain]),
    );

    // Act
    const result = await usecase.execute(input);

    // Assert
    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockRepo.findByProductIds).toHaveBeenCalledWith([1, 2]);

    const expected: CheckStockResponse[] = [
      { isAvailable: true, availableQuantity: 10, requestedQuantity: 1 },
      { isAvailable: false, availableQuantity: 5, requestedQuantity: 10 },
      { isAvailable: true, availableQuantity: 10, requestedQuantity: 5 },
    ];
    expect(result.value).toEqual(expected);
  });

  it('should return a failure if the repository fails to fetch inventories', async () => {
    // Arrange
    const input = [{ productId: 1, quantity: 1 }];
    const repoError = ErrorFactory.RepositoryError(
      'Database connection failed',
    );
    mockRepo.findByProductIds.mockResolvedValue(repoError);

    // Act
    const result = await usecase.execute(input);

    // Assert
    ResultAssertionHelper.assertResultFailureWithError(result, repoError.error);
    expect(mockRepo.findByProductIds).toHaveBeenCalledWith([1]);
  });

  it('should return a failure if the domain check fails for any item', async () => {
    // Arrange
    const input = [
      { productId: 1, quantity: 1 },
      { productId: 2, quantity: -5 },
    ];

    const inv1Domain = Inventory.fromPrimitives(
      InventoryTestFactory.createInStockInventory({ productId: 1 }),
    );
    const inv2Domain = Inventory.fromPrimitives(
      InventoryTestFactory.createInStockInventory({ productId: 2 }),
    );

    const domainError = ErrorFactory.DomainError('Quantity cannot be negative');

    jest.spyOn(inv1Domain, 'isInStock').mockReturnValue(Result.success(true));
    jest.spyOn(inv2Domain, 'isInStock').mockReturnValue(domainError);

    mockRepo.findByProductIds.mockResolvedValue(
      Result.success([inv1Domain, inv2Domain]),
    );

    // Act
    const result = await usecase.execute(input);

    // Assert
    ResultAssertionHelper.assertResultFailureWithError(
      result,
      domainError.error,
    );
  });

  it('should return a use case error on unexpected exceptions', async () => {
    // Arrange
    const input = [{ productId: 888, quantity: 1 }];
    const unexpectedError = new Error('A terrible server error occurred');
    mockRepo.findByProductIds.mockRejectedValue(unexpectedError);

    // Act
    const result = await usecase.execute(input);

    // Assert
    ResultAssertionHelper.assertResultFailure(
      result,
      'Unexpected UseCase Error',
      UseCaseError,
      unexpectedError,
    );
    expect(mockRepo.findByProductIds).toHaveBeenCalledWith([888]);
  });
});
