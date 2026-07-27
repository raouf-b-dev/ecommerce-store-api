import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { SeedDemoInventoryUseCase } from './seed-demo-inventory.usecase';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';
import { MockInventoryRepository } from '../../../testing/mocks/inventory-repository.mock';
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Inventory } from '../../domain/entities/inventory';

describe('SeedDemoInventoryUseCase', () => {
  let useCase: SeedDemoInventoryUseCase;
  let inventoryRepository: MockInventoryRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedDemoInventoryUseCase,
        {
          provide: InventoryRepository,
          useClass: MockInventoryRepository,
        },
      ],
    }).compile();

    useCase = module.get<SeedDemoInventoryUseCase>(SeedDemoInventoryUseCase);
    inventoryRepository = module.get<InventoryRepository>(
      InventoryRepository,
    ) as unknown as MockInventoryRepository;
  });

  const mockSeedItems = [
    { productId: 1, sku: 'PROD-A', initialStock: 10, lowStockThreshold: 2 },
    { productId: 2, sku: 'PROD-B', initialStock: 20, lowStockThreshold: 5 },
  ];

  it('should seed inventory when it does not exist', async () => {
    inventoryRepository.findByProductId.mockResolvedValue(
      Result.failure(
        new RepositoryError(
          'Inventory not found',
          undefined,
          HttpStatus.NOT_FOUND,
        ),
      ),
    );
    inventoryRepository.save.mockResolvedValue(Result.success({} as any));

    const result = await useCase.execute(mockSeedItems);

    expect(result.isSuccess).toBe(true);
    expect((result as any).value).toEqual([
      { productId: 1, sku: 'PROD-A', status: 'created' },
      { productId: 2, sku: 'PROD-B', status: 'created' },
    ]);
    expect(inventoryRepository.findByProductId).toHaveBeenCalledWith(1);
    expect(inventoryRepository.findByProductId).toHaveBeenCalledWith(2);
    expect(inventoryRepository.save).toHaveBeenCalledTimes(2);
  });

  it('should skip seeding if inventory already exists', async () => {
    const mockInventory = {} as Inventory;
    inventoryRepository.findByProductId.mockResolvedValue(
      Result.success(mockInventory),
    );

    const result = await useCase.execute(mockSeedItems);

    expect(result.isSuccess).toBe(true);
    expect((result as any).value).toEqual([
      { productId: 1, sku: 'PROD-A', status: 'existing' },
      { productId: 2, sku: 'PROD-B', status: 'existing' },
    ]);
    expect(inventoryRepository.save).not.toHaveBeenCalled();
  });

  it('should fail if checking inventory fails with unexpected database error', async () => {
    inventoryRepository.findByProductId.mockResolvedValue(
      Result.failure(new RepositoryError('Database went down')),
    );

    const result = await useCase.execute(mockSeedItems);

    expect(result.isFailure).toBe(true);
    expect((result as any).error?.message).toContain(
      'Failed to check existing inventory for PROD-A',
    );
    expect(inventoryRepository.save).not.toHaveBeenCalled();
  });

  it('should propagate failure if inventory saving fails', async () => {
    inventoryRepository.findByProductId.mockResolvedValue(
      Result.failure(
        new RepositoryError(
          'Inventory not found',
          undefined,
          HttpStatus.NOT_FOUND,
        ),
      ),
    );
    inventoryRepository.save.mockResolvedValue(
      Result.failure(new RepositoryError('Save failed')),
    );

    const result = await useCase.execute([mockSeedItems[0]]);

    expect(result.isFailure).toBe(true);
    expect((result as any).error?.message).toContain(
      'Failed to seed inventory for PROD-A',
    );
  });
});
