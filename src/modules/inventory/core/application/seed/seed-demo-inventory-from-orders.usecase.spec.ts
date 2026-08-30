import { MockInventoryRepository } from 'src/modules/inventory/testing';
import { SeedDemoInventoryFromOrdersUseCase } from './seed-demo-inventory-from-orders.usecase';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { Inventory } from '../../domain/entities/inventory';
import { Result } from '../../../../../shared-kernel/domain/result';

describe('SeedDemoInventoryFromOrdersUseCase', () => {
  let useCase: SeedDemoInventoryFromOrdersUseCase;
  let mockInventoryRepository: MockInventoryRepository;

  beforeEach(() => {
    mockInventoryRepository = new MockInventoryRepository();
    useCase = new SeedDemoInventoryFromOrdersUseCase(mockInventoryRepository);
    mockInventoryRepository.mockSuccessfulSave();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resets to baseline then holds and consumes via domain methods', async () => {
    mockInventoryRepository.findByProductIdForUpdate.mockImplementation(
      async (productId: number) => {
        const withId = Inventory.fromPrimitives({
          id: productId,
          productId,
          availableQuantity: 50,
          reservedQuantity: 5,
          lowStockThreshold: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastRestockDate: null,
        });
        return Result.success({ entity: withId, expectedVersion: 1 });
      },
    );

    const result = await useCase.execute({
      baselines: [
        { productId: 1, availableQuantity: 110 },
        { productId: 2, availableQuantity: 150 },
      ],
      lines: [
        { productId: 1, quantity: 1, effect: 'hold' },
        { productId: 2, quantity: 2, effect: 'consume' },
      ],
    });

    ResultAssertionHelper.assertResultSuccess(result);
    const byProduct = new Map(result.value.map((r) => [r.productId, r]));
    expect(byProduct.get(1)).toMatchObject({
      availableQuantity: 109,
      reservedQuantity: 1,
    });
    expect(byProduct.get(2)).toMatchObject({
      availableQuantity: 148,
      reservedQuantity: 0,
    });
    expect(mockInventoryRepository.save).toHaveBeenCalledTimes(2);
  });
});
