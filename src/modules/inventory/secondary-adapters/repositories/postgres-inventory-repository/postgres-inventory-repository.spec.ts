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
import {
  createMockTransactionManager,
  createMockQueryBuilder,
} from '../../../../../testing/mocks/typeorm.mocks';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { InventoryEntityTestFactory } from '../../../testing/factories/inventory-entity.test.factory';
import { Inventory } from '../../../core/domain/entities/inventory';
import { InventoryTestFactory } from '../../../testing/factories/inventory.test.factory';
import { InventoryMapper } from '../../persistence/mappers/inventory.mapper';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { PostgresInventoryRepository } from './postgres-inventory-repository';
import { InventoryCommandTestFactory } from '../../../testing/factories/inventory-dto.test.factory';
import { LowStockQuery } from '../../../core/domain/repositories/inventory.repository';

describe('PostgresInventoryRepository', () => {
  let repository: PostgresInventoryRepository;
  let mockOrmRepo: jest.Mocked<Repository<InventoryEntity>>;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockTransactionManager: any;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<InventoryEntity>>;
  let defaultLowStockQuery: LowStockQuery;

  beforeEach(async () => {
    defaultLowStockQuery = InventoryCommandTestFactory.createLowStockQuery();
    mockQueryBuilder = createMockQueryBuilder<InventoryEntity>();
    mockTransactionManager = createMockTransactionManager({ mockQueryBuilder });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresInventoryRepository,
        {
          provide: getRepositoryToken(InventoryEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<PostgresInventoryRepository>(
      PostgresInventoryRepository,
    );
    mockOrmRepo = module.get(getRepositoryToken(InventoryEntity));
    mockDataSource = module.get(DataSource);

    mockDataSource.transaction.mockImplementation(
      (isolationOrCb: unknown, cb?: unknown) => {
        const callback = (
          typeof isolationOrCb === 'function' ? isolationOrCb : cb
        ) as (mgr: unknown) => Promise<unknown>;
        return callback(mockTransactionManager);
      },
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

      const result = await repository.findById(404);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Inventory not found',
        RepositoryError,
      );
    });

    it('should return a RepositoryError on database error', async () => {
      const dbError = new Error('DB Error');
      mockOrmRepo.findOne.mockRejectedValue(dbError);

      const result = await repository.findById(500);

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

      const result = await repository.findByProductId(404);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Inventory not found for product 404',
        RepositoryError,
      );
    });

    it('should return a RepositoryError on database error', async () => {
      const dbError = new Error('DB Error');
      mockOrmRepo.findOne.mockRejectedValue(dbError);

      const result = await repository.findByProductId(500);

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
        InventoryEntityTestFactory.createEntityForProduct(1),
        InventoryEntityTestFactory.createEntityForProduct(2),
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);

      const result = await repository.findByProductIds([1, 2]);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrmRepo.createQueryBuilder).toHaveBeenCalledWith('inventory');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'inventory.productId IN (:...productIds)',
        { productIds: [1, 2] },
      );
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
      expect(result.value).toHaveLength(2);
      expect(result.value[0].productId).toBe(1);
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

      const result = await repository.findByProductIds([1]);

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

      const result = await repository.findLowStock(defaultLowStockQuery);

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

      const customQuery = InventoryCommandTestFactory.createLowStockQuery({
        threshold: 15,
        page: 3,
        limit: 50,
      });

      const result = await repository.findLowStock(customQuery);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'inventory.availableQuantity <= :threshold',
        { threshold: 15 },
      );

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(100);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
      expect(result.value).toEqual([]);
    });

    it('should find low stock with default pagination and threshold', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await repository.findLowStock(defaultLowStockQuery);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'inventory.availableQuantity <= :threshold',
        { threshold: defaultLowStockQuery.threshold },
      );

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(result.value).toEqual([]);
    });
    it('should return a RepositoryError on database error', async () => {
      const dbError = new Error('DB Error');
      mockQueryBuilder.getMany.mockRejectedValue(dbError);

      const result = await repository.findLowStock(defaultLowStockQuery);

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
    it('should save inventory successfully', async () => {
      const domainInventory = InventoryTestFactory.createMockInventory();
      const entityToSave = InventoryMapper.toEntity(
        Inventory.fromPrimitives(domainInventory),
      );

      mockOrmRepo.save.mockResolvedValue(entityToSave);

      const result = await repository.save(
        Inventory.fromPrimitives(domainInventory),
      );

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrmRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 1,
        }),
      );
    });

    it('should return a RepositoryError on save failure', async () => {
      const dbError = new Error('DB Error');
      const domainInventory = InventoryTestFactory.createMockInventory();
      mockOrmRepo.save.mockRejectedValue(dbError);

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

  describe('findByIdForUpdate', () => {
    it('should return inventory and version for update', async () => {
      const entity = InventoryEntityTestFactory.createInventoryEntity();
      mockOrmRepo.findOne.mockResolvedValue(entity);

      const result = await repository.findByIdForUpdate(entity.id);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value.entity.id).toBe(entity.id);
        expect(result.value.expectedVersion).toBe(entity.version);
      }
    });

    it('should return error when inventory not found', async () => {
      mockOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findByIdForUpdate(999);

      ResultAssertionHelper.assertResultFailure(result, 'Inventory not found');
    });
  });

  // ----------------------------------------------------------------
  // delete
  // ----------------------------------------------------------------
  describe('delete', () => {
    it('should delete an inventory', async () => {
      mockOrmRepo.delete.mockResolvedValue({ affected: 1 } as DeleteResult);

      const result = await repository.delete(1);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrmRepo.delete).toHaveBeenCalledWith({ id: 1 });
      expect(result.value).toBeUndefined();
    });

    it('should return a RepositoryError if inventory to delete is not found', async () => {
      mockOrmRepo.delete.mockResolvedValue({ affected: 0 } as DeleteResult);

      const result = await repository.delete(404);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Inventory not found',
        RepositoryError,
      );
    });

    it('should return a RepositoryError on database error', async () => {
      const dbError = new Error('DB Error');
      mockOrmRepo.delete.mockRejectedValue(dbError);

      const result = await repository.delete(500);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to delete inventory',
        RepositoryError,
        dbError,
      );
    });
  });
});
