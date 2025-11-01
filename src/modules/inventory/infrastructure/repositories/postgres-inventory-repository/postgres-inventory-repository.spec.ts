// src/modules/inventory/infrastructure/repositories/postgres-inventory.repository.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  DataSource,
  DeleteResult,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { InventoryEntity } from '../../orm/inventory.schema';
import { IdGeneratorService } from '../../../../../core/infrastructure/orm/id-generator.service';
import {
  createMockDataSource,
  createMockTransactionManager,
  createMockQueryBuilder,
} from '../../../../../testing/mocks/typeorm.mocks';
import { createMockIdGenerator } from '../../../../../testing/mocks/id-generator.mocks';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { InventoryEntityTestFactory } from '../../../testing/factories/inventory-entity.test.factory';
import { Inventory } from '../../../domain/entities/inventory';
import { InventoryTestFactory } from '../../../testing/factories/inventory.test.factory';
import { InventoryMapper } from '../../persistence/mappers/inventory.mapper';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { PostgresInventoryRepository } from './postgres-inventory-repository';

describe('PostgresInventoryRepository', () => {
  let repository: PostgresInventoryRepository;
  let mockOrmRepo: jest.Mocked<Repository<InventoryEntity>>;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockIdGenerator: jest.Mocked<IdGeneratorService>;
  let mockTransactionManager: any;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<InventoryEntity>>;

  beforeEach(async () => {
    mockQueryBuilder = createMockQueryBuilder<InventoryEntity>();
    mockTransactionManager = createMockTransactionManager({ mockQueryBuilder });

    mockDataSource = createMockDataSource(mockTransactionManager) as any;
    mockIdGenerator = createMockIdGenerator({ inventoryId: 'new-inv-123' });

    mockOrmRepo = {
      findOne: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresInventoryRepository,
        {
          provide: getRepositoryToken(InventoryEntity),
          useValue: mockOrmRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: IdGeneratorService,
          useValue: mockIdGenerator,
        },
      ],
    }).compile();

    repository = module.get<PostgresInventoryRepository>(
      PostgresInventoryRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  // ----------------------------------------------------------------
  // findById
  // ----------------------------------------------------------------
  describe('findById', () => {
    it('should return an inventory when found', async () => {
      const mockEntity = InventoryEntityTestFactory.createInventoryEntity();
      mockOrmRepo.findOne.mockResolvedValue(mockEntity);

      const result = await repository.findById(mockEntity.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrmRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockEntity.id },
      });
      expect(result.value).toBeInstanceOf(Inventory);
      expect(result.value.id).toBe(mockEntity.id);
    });

    it('should return a RepositoryError when not found', async () => {
      mockOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById('not-found-id');

      ResultAssertionHelper.assertResultFailure(
        result,
        'Inventory not found',
        RepositoryError,
      );
    });

    it('should return a RepositoryError on database error', async () => {
      const dbError = new Error('DB Error');
      mockOrmRepo.findOne.mockRejectedValue(dbError);

      const result = await repository.findById('any-id');

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find inventory',
        RepositoryError,
        dbError,
      );
    });
  });

  // ----------------------------------------------------------------
  // findByProductId
  // ----------------------------------------------------------------
  describe('findByProductId', () => {
    it('should return an inventory when found by product ID', async () => {
      const mockEntity = InventoryEntityTestFactory.createInventoryEntity();
      mockOrmRepo.findOne.mockResolvedValue(mockEntity);

      const result = await repository.findByProductId(mockEntity.productId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrmRepo.findOne).toHaveBeenCalledWith({
        where: { productId: mockEntity.productId },
      });
      expect(result.value.productId).toBe(mockEntity.productId);
    });

    it('should return a RepositoryError when not found', async () => {
      mockOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findByProductId('not-found-pid');

      ResultAssertionHelper.assertResultFailure(
        result,
        'Inventory not found for product not-found-pid',
        RepositoryError,
      );
    });

    it('should return a RepositoryError on database error', async () => {
      const dbError = new Error('DB Error');
      mockOrmRepo.findOne.mockRejectedValue(dbError);

      const result = await repository.findByProductId('any-pid');

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find inventory by product ID',
        RepositoryError,
        dbError,
      );
    });
  });

  // ----------------------------------------------------------------
  // findByProductIds
  // ----------------------------------------------------------------
  describe('findByProductIds', () => {
    it('should return a list of inventories', async () => {
      const mockEntities = [
        InventoryEntityTestFactory.createEntityForProduct('P1'),
        InventoryEntityTestFactory.createEntityForProduct('P2'),
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);

      const result = await repository.findByProductIds(['P1', 'P2']);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrmRepo.createQueryBuilder).toHaveBeenCalledWith('inventory');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'inventory.productId IN (:...productIds)',
        { productIds: ['P1', 'P2'] },
      );
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
      expect(result.value).toHaveLength(2);
      expect(result.value[0].productId).toBe('P1');
    });

    it('should return an empty array if no product IDs are provided', async () => {
      const result = await repository.findByProductIds([]);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual([]);
      expect(mockOrmRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should return a RepositoryError on database error', async () => {
      const dbError = new Error('DB Error');
      mockQueryBuilder.getMany.mockRejectedValue(dbError);

      const result = await repository.findByProductIds(['P1']);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find inventories by product IDs',
        RepositoryError,
        dbError,
      );
    });
  });

  // ----------------------------------------------------------------
  // findLowStock
  // ----------------------------------------------------------------
  describe('findLowStock', () => {
    it('should find low stock with default parameters', async () => {
      const mockEntities = [InventoryEntityTestFactory.createLowStockEntity()];
      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);

      const result = await repository.findLowStock();

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrmRepo.createQueryBuilder).toHaveBeenCalledWith('inventory');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'inventory.availableQuantity > 0',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'inventory.availableQuantity <= :threshold',
        { threshold: 10 },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'inventory.availableQuantity',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
      expect(result.value).toHaveLength(1);
    });

    it('should find low stock with custom pagination and threshold', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await repository.findLowStock(5, 3, 50);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'inventory.availableQuantity <= :threshold',
        { threshold: 5 },
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(100); // (3 - 1) * 50
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
      expect(result.value).toEqual([]);
    });

    it('should return a RepositoryError on database error', async () => {
      const dbError = new Error('DB Error');
      mockQueryBuilder.getMany.mockRejectedValue(dbError);

      const result = await repository.findLowStock();

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find low stock inventories',
        RepositoryError,
        dbError,
      );
    });
  });

  // ----------------------------------------------------------------
  // save
  // ----------------------------------------------------------------
  describe('save', () => {
    it('should save a new inventory within a transaction', async () => {
      const domainInventory = InventoryTestFactory.createMockInventory();

      const entityToSave = InventoryMapper.toEntity(
        Inventory.fromPrimitives(domainInventory),
      );
      entityToSave.id = 'new-inv-123'; // ID from mock generator

      mockTransactionManager.findOne.mockResolvedValue(null);
      mockTransactionManager.save.mockResolvedValue(entityToSave);

      const result = await repository.save(
        Inventory.fromPrimitives(domainInventory),
      );

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockTransactionManager.findOne).toHaveBeenCalledWith(
        InventoryEntity,
        {
          where: { productId: 'PR0000001' },
        },
      );
      expect(mockIdGenerator.generateInventoryId).toHaveBeenCalled();
      expect(mockTransactionManager.save).toHaveBeenCalledWith(
        InventoryEntity,
        expect.objectContaining({
          id: 'new-inv-123',
          productId: 'PR0000001',
        }),
      );
      expect(result.value.id).toBe('new-inv-123');
    });

    it('should return a RepositoryError if inventory for product already exists', async () => {
      const domainInventory = InventoryTestFactory.createMockInventory();
      const existingEntity = InventoryEntityTestFactory.createInventoryEntity();
      mockTransactionManager.findOne.mockResolvedValue(existingEntity);

      const result = await repository.save(
        Inventory.fromPrimitives(domainInventory),
      );

      ResultAssertionHelper.assertResultFailure(
        result,
        `INVENTORY_EXISTS: Inventory already exists for product ${domainInventory.productId}`,
        RepositoryError,
      );
      expect(mockIdGenerator.generateInventoryId).not.toHaveBeenCalled();
      expect(mockTransactionManager.save).not.toHaveBeenCalled();
    });

    it('should return a RepositoryError on transaction failure', async () => {
      const dbError = new Error('DB Error');
      const domainInventory = InventoryTestFactory.createMockInventory();
      mockDataSource.transaction.mockRejectedValue(dbError);

      const result = await repository.save(
        Inventory.fromPrimitives(domainInventory),
      );

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save inventory',
        RepositoryError,
        dbError,
      );
    });

    it('should return a RepositoryError on findOne failure inside transaction', async () => {
      const dbError = new Error('DB Error');
      const domainInventory = InventoryTestFactory.createMockInventory();
      mockTransactionManager.findOne.mockRejectedValue(dbError);

      const result = await repository.save(
        Inventory.fromPrimitives(domainInventory),
      );

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save inventory',
        RepositoryError,
        dbError,
      );
    });
  });

  // ----------------------------------------------------------------
  // update
  // ----------------------------------------------------------------
  describe('update', () => {
    it('should update an existing inventory within a transaction', async () => {
      const domainInventory = InventoryTestFactory.createMockInventory({
        availableQuantity: 999,
      });
      const existingEntity = InventoryEntityTestFactory.createInventoryEntity({
        id: domainInventory.id,
      });
      const updatedEntity = InventoryMapper.toEntity(
        Inventory.fromPrimitives(domainInventory),
      );

      mockTransactionManager.findOne
        .mockResolvedValueOnce(existingEntity)
        .mockResolvedValueOnce(updatedEntity);
      mockTransactionManager.update.mockResolvedValue({ affected: 1 });

      const result = await repository.update(
        Inventory.fromPrimitives(domainInventory),
      );

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockTransactionManager.findOne).toHaveBeenCalledWith(
        InventoryEntity,
        {
          where: { id: domainInventory.id },
        },
      );
      expect(mockTransactionManager.update).toHaveBeenCalledWith(
        InventoryEntity,
        { id: domainInventory.id },
        expect.objectContaining({
          availableQuantity: 999,
        }),
      );
      expect(mockTransactionManager.findOne).toHaveBeenCalledTimes(2);
      expect(result.value.availableQuantity).toBe(999);
    });

    it('should return a RepositoryError if inventory to update is not found', async () => {
      const domainInventory = InventoryTestFactory.createMockInventory();
      mockTransactionManager.findOne.mockResolvedValue(null);

      const result = await repository.update(
        Inventory.fromPrimitives(domainInventory),
      );

      ResultAssertionHelper.assertResultFailure(
        result,
        `INVENTORY_NOT_FOUND: Inventory with ID ${domainInventory.id} not found`,
        RepositoryError,
      );
      expect(mockTransactionManager.update).not.toHaveBeenCalled();
    });

    it('should return a RepositoryError if inventory not found after update', async () => {
      const domainInventory = InventoryTestFactory.createMockInventory();
      const existingEntity = InventoryEntityTestFactory.createInventoryEntity({
        id: domainInventory.id,
      });

      mockTransactionManager.findOne
        .mockResolvedValueOnce(existingEntity)
        .mockResolvedValueOnce(null);
      mockTransactionManager.update.mockResolvedValue({ affected: 1 });

      const result = await repository.update(
        Inventory.fromPrimitives(domainInventory),
      );

      ResultAssertionHelper.assertResultFailure(
        result,
        `INVENTORY_NOT_FOUND: Inventory with ID ${domainInventory.id} not found after update`,
        RepositoryError,
      );
    });

    it('should return a RepositoryError on transaction failure', async () => {
      const dbError = new Error('DB Error');
      const domainInventory = InventoryTestFactory.createMockInventory();
      mockDataSource.transaction.mockRejectedValue(dbError);

      const result = await repository.update(
        Inventory.fromPrimitives(domainInventory),
      );

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update inventory',
        RepositoryError,
        dbError,
      );
    });
  });

  // ----------------------------------------------------------------
  // delete
  // ----------------------------------------------------------------
  describe('delete', () => {
    it('should delete an inventory', async () => {
      mockOrmRepo.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      const result = await repository.delete('existing-id');

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrmRepo.delete).toHaveBeenCalledWith({ id: 'existing-id' });
      expect(result.value).toBeUndefined();
    });

    it('should return a RepositoryError if inventory to delete is not found', async () => {
      mockOrmRepo.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      const result = await repository.delete('not-found-id');

      ResultAssertionHelper.assertResultFailure(
        result,
        'Inventory not found',
        RepositoryError,
      );
    });

    it('should return a RepositoryError on database error', async () => {
      const dbError = new Error('DB Error');
      mockOrmRepo.delete.mockRejectedValue(dbError);

      const result = await repository.delete('any-id');

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to delete inventory',
        RepositoryError,
        dbError,
      );
    });
  });
});
