// src/modules/products/infrastructure/repositories/postgres-product.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../../orm/product.schema';
import { Product } from '../../../domain/entities/product';
import { isFailure, isSuccess } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { PostgresProductRepository } from './postgres.product-repository';

// Mock repository for dependency injection
const mockTypeOrmRepository = {
  create: jest.fn(),
  save: jest.fn(),
  merge: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  delete: jest.fn(),
};

// Reusable test data
const productDomain = new Product({
  id: 1,
  name: 'car',
  description: 'A fast red sports car',
  price: 35000,
  sku: 'CAR-001',
  stockQuantity: 10,
  createdAt: new Date('2025-01-01T10:00:00Z'),
  updatedAt: new Date('2025-08-13T15:00:00Z'),
});
const productEntity = {
  id: 1,
  name: 'car',
  description: 'A fast red sports car',
  price: 35000,
  sku: 'CAR-001',
  stockQuantity: 10,
  createdAt: new Date('2025-01-01T10:00:00Z'),
  updatedAt: new Date('2025-08-13T15:00:00Z'),
} as ProductEntity;
const dbError = new Error('DB Error');

describe('PostgresProductRepository', () => {
  let repository: PostgresProductRepository;
  let ormRepo: Repository<ProductEntity>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresProductRepository,
        {
          provide: getRepositoryToken(ProductEntity),
          useValue: mockTypeOrmRepository,
        },
      ],
    }).compile();

    repository = module.get<PostgresProductRepository>(
      PostgresProductRepository,
    );
    ormRepo = module.get<Repository<ProductEntity>>(
      getRepositoryToken(ProductEntity),
    );
  });

  describe('save', () => {
    it('should successfully save a new product', async () => {
      mockTypeOrmRepository.create.mockReturnValue(productEntity);
      mockTypeOrmRepository.save.mockResolvedValue(productEntity);

      const result = await repository.save(productDomain);

      expect(isSuccess(result)).toBe(true);
      // More specific check for void success
      if (isSuccess(result)) {
        expect(result.value).toBeUndefined();
      }
      expect(ormRepo.create).toHaveBeenCalledWith(productDomain);
      expect(ormRepo.save).toHaveBeenCalledWith(productEntity);
    });

    it('should return a failure if the database throws an error', async () => {
      mockTypeOrmRepository.save.mockRejectedValue(dbError);

      const result = await repository.save(productDomain);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(result.error.cause).toBe(dbError);
      }
    });
  });

  describe('update', () => {
    it('should successfully update an existing product', async () => {
      const productToUpdate = new Product({
        id: 2,
        name: 'Bike',
        description: 'A mountain bike suitable for rough terrain',
        price: 1200,
        sku: 'BIKE-002',
        stockQuantity: 5,
        createdAt: new Date('2025-02-15T09:30:00Z'),
        updatedAt: new Date('2025-08-10T12:00:00Z'),
      });

      const mergedEntity = { ...productEntity, name: 'Bike' };

      mockTypeOrmRepository.findOne.mockResolvedValue(productEntity);
      mockTypeOrmRepository.merge.mockReturnValue(mergedEntity);
      mockTypeOrmRepository.save.mockResolvedValue(mergedEntity);

      const result = await repository.update(productToUpdate);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBeUndefined();
      }
      expect(ormRepo.findOne).toHaveBeenCalledWith({ where: { id: 2 } });
      expect(ormRepo.merge).toHaveBeenCalledWith(productEntity, {
        name: 'Bike',
      });
      expect(ormRepo.save).toHaveBeenCalledWith(mergedEntity);
    });

    it('should return a failure if the product to update is not found', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.update(productDomain);

      expect(isFailure(result)).toBe(true);
      expect(ormRepo.merge).not.toHaveBeenCalled();
      expect(ormRepo.save).not.toHaveBeenCalled();
    });

    it('should return a failure if the database throws an error during update', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(productEntity);
      mockTypeOrmRepository.save.mockRejectedValue(dbError);

      const result = await repository.update(productDomain);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(result.error.cause).toBe(dbError);
      }
    });
  });

  describe('findById', () => {
    it('should return the product when it is found', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(productEntity);

      const result = await repository.findById(1);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual(productEntity);
      }
      expect(ormRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return a failure when the product is not found', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(isFailure(result)).toBe(true);
    });

    it('should return a failure if the database throws an error', async () => {
      mockTypeOrmRepository.findOne.mockRejectedValue(dbError);

      const result = await repository.findById(1);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.cause).toBe(dbError);
      }
    });
  });

  describe('findAll', () => {
    it('should return a list of products', async () => {
      const products = [productEntity, { ...productEntity, id: 2 }];
      mockTypeOrmRepository.find.mockResolvedValue(products);

      const result = await repository.findAll();

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(2);
        expect(result.value).toEqual(products);
      }
    });

    it('should return a failure when no products are found', async () => {
      mockTypeOrmRepository.find.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('Did not find any products');
      }
    });

    it('should return a failure if the database throws an error', async () => {
      mockTypeOrmRepository.find.mockRejectedValue(dbError);

      const result = await repository.findAll();

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.cause).toBe(dbError);
      }
    });
  });

  describe('deleteById', () => {
    it('should successfully delete an product', async () => {
      mockTypeOrmRepository.delete.mockResolvedValue(undefined);

      const result = await repository.deleteById(1);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBeUndefined();
      }
      expect(ormRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should return a failure if the database throws an error', async () => {
      mockTypeOrmRepository.delete.mockRejectedValue(dbError);

      const result = await repository.deleteById(1);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.cause).toBe(dbError);
      }
    });
  });
});
