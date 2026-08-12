// src/modules/products/infrastructure/repositories/PostgresProductRepository/postgres.product-repository.spec.ts
import { ProductTestFactory } from 'src/modules/products/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresProductRepository } from './postgres.product-repository';
import { ProductEntity } from '../../orm/product.schema';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { ResultAssertionHelper } from '../../../../../testing';
import { ProductEntityTestFactory } from 'src/modules/products/testing';
import { Product } from '../../../core/domain/entities/product';

describe('PostgresProductRepository', () => {
  let repository: PostgresProductRepository;
  let ormRepo: jest.Mocked<Repository<ProductEntity>>;

  const mockProductEntity: ProductEntity =
    ProductEntityTestFactory.createProductEntity();

  beforeEach(async () => {
    const mockOrmRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      merge: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresProductRepository,
        {
          provide: getRepositoryToken(ProductEntity),
          useValue: mockOrmRepo,
        },
      ],
    }).compile();

    repository = testingModule.get<PostgresProductRepository>(
      PostgresProductRepository,
    );
    ormRepo = testingModule.get(getRepositoryToken(ProductEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByIdForUpdate', () => {
    it('should find product for update and return entity with expectedVersion', async () => {
      const productId = 1;
      ormRepo.findOne.mockResolvedValue({
        ...mockProductEntity,
        id: productId,
        version: 3,
      });

      const result = await repository.findByIdForUpdate(productId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.entity.id).toBe(productId);
      expect(result.value.expectedVersion).toBe(3);
    });

    it('should return failure when product not found', async () => {
      ormRepo.findOne.mockResolvedValue(null);

      const result = await repository.findByIdForUpdate(999);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Product with ID 999 not found',
        RepositoryError,
      );
    });
  });

  describe('save', () => {
    it('should successfully save a product entity with expectedVersion', async () => {
      const domainProduct = Product.fromPrimitives(
        ProductTestFactory.createMockProduct({ id: 1 }),
      );
      ormRepo.save.mockResolvedValue({
        ...mockProductEntity,
        id: 1,
        version: 2,
      });

      const result = await repository.save(domainProduct, 1);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(ormRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should return failure when database save fails', async () => {
      const domainProduct = Product.fromPrimitives(
        ProductTestFactory.createMockProduct(),
      );
      const error = new Error('Database save failed');

      ormRepo.save.mockRejectedValue(error);

      const result = await repository.save(domainProduct);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save the product',
        RepositoryError,
      );
    });
  });

  describe('findById', () => {
    it('should successfully find a product by id', async () => {
      const productId = 1;

      ormRepo.findOne.mockResolvedValue(mockProductEntity);

      const result = await repository.findById(productId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(productId);
      expect(ormRepo.findOne).toHaveBeenCalledWith({
        where: { id: productId },
      });
    });

    it('should return failure when product not found', async () => {
      const productId = 999;

      ormRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById(productId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Product not found',
        RepositoryError,
      );
    });

    it('should return failure when database query fails', async () => {
      const productId = 1;
      const error = new Error('Database query failed');

      ormRepo.findOne.mockRejectedValue(error);

      const result = await repository.findById(productId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find the product',
        RepositoryError,
      );
    });
  });

  describe('findAll', () => {
    it('should successfully find all products', async () => {
      const mockProducts = ProductEntityTestFactory.createProductEntities([
        1, 2, 3,
      ]);
      const mockEntities = mockProducts.map((p, index) => ({
        ...p,
        id: index + 1,
      }));

      ormRepo.find.mockResolvedValue(mockEntities);

      const result = await repository.findAll();

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toHaveLength(3);
      expect(ormRepo.find).toHaveBeenCalledTimes(1);
    });

    it('should return success with empty array when no products found', async () => {
      ormRepo.find.mockResolvedValue([]);

      const result = await repository.findAll();

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual([]);
    });

    it('should return failure when database query fails', async () => {
      const error = new Error('Database query failed');

      ormRepo.find.mockRejectedValue(error);

      const result = await repository.findAll();

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find products',
        RepositoryError,
      );
    });
  });

  describe('deleteById', () => {
    it('should successfully delete a product', async () => {
      const productId = 1;

      ormRepo.delete.mockResolvedValue({ affected: 1, raw: {} });

      const result = await repository.deleteById(productId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBeUndefined();
      expect(ormRepo.delete).toHaveBeenCalledWith(productId);
    });

    it('should return failure when database delete fails', async () => {
      const productId = 1;
      const error = new Error('Database delete failed');

      ormRepo.delete.mockRejectedValue(error);

      const result = await repository.deleteById(productId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to delete the product',
        RepositoryError,
      );
    });
  });
});
