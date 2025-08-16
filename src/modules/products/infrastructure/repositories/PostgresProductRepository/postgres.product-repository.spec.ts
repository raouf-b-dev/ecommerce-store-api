// src/modules/products/infrastructure/repositories/postgres-product.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../../orm/product.schema';
import { Product } from '../../../domain/entities/product';
import { isFailure, isSuccess } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { PostgresProductRepository } from './postgres.product-repository';
import { CreateProductDto } from '../../../presentation/dto/create-product.dto';
import { UpdateProductDto } from '../../../presentation/dto/update-product.dto';

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
let productDomain: Product;
let productEntity: ProductEntity;

let createProductDto: CreateProductDto;

let updateProductDto: UpdateProductDto;
let id: number;

let dbError: Error;

describe('PostgresProductRepository', () => {
  let repository: PostgresProductRepository;
  let ormRepo: Repository<ProductEntity>;

  id = 1;

  // Reusable test data
  productDomain = new Product({
    id,
    name: 'car',
    description: 'A fast red sports car',
    price: 35000,
    sku: 'CAR-001',
    stockQuantity: 10,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-08-13T15:00:00Z'),
  });

  productEntity = {
    id,
    name: 'car',
    description: 'A fast red sports car',
    price: 35000,
    sku: 'CAR-001',
    stockQuantity: 10,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-08-13T15:00:00Z'),
  } as ProductEntity;

  createProductDto = {
    name: 'car',
    description: 'A fast red sports car',
    price: 35000,
    sku: 'CAR-001',
    stockQuantity: 10,
  } as CreateProductDto;

  updateProductDto = {
    name: 'car',
    description: 'A fast red sports car',
    price: 35000,
    sku: 'CAR-001',
    stockQuantity: 10,
  } as UpdateProductDto;

  dbError = new Error('DB Error');

  beforeEach(async () => {
    jest.clearAllMocks();
    let module: TestingModule = await Test.createTestingModule({
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

      let result = await repository.save(createProductDto);

      expect(isSuccess(result)).toBe(true);
      // More specific check for void success
      if (isSuccess(result)) {
        expect(result.value).toBe(productEntity);
      }
      expect(ormRepo.create).toHaveBeenCalledWith({
        ...createProductDto,
        createdAt: expect.any(Date),
      });
      expect(ormRepo.save).toHaveBeenCalledWith(productEntity);
    });

    it('should return a failure if the database throws an error', async () => {
      mockTypeOrmRepository.save.mockRejectedValue(dbError);

      let result = await repository.save(createProductDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(RepositoryError);
        expect(result.error.cause).toBe(dbError);
      }
    });
  });

  describe('update', () => {
    it('should successfully update an existing product', async () => {
      let mergedEntity: ProductEntity = {
        ...productEntity,
        ...updateProductDto,
        updatedAt: new Date('2025-08-13T15:00:00Z'),
      };

      mockTypeOrmRepository.findOne.mockResolvedValue(productEntity);
      mockTypeOrmRepository.merge.mockReturnValue(mergedEntity);
      mockTypeOrmRepository.save.mockResolvedValue(mergedEntity);

      let result = await repository.update(id, updateProductDto);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(mergedEntity);
      }
      expect(ormRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(ormRepo.merge).toHaveBeenCalledWith(productEntity, {
        ...updateProductDto,
        updatedAt: expect.any(Date),
      });
      expect(ormRepo.save).toHaveBeenCalledWith(mergedEntity);
    });

    it('should return a failure if the product to update is not found', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      let result = await repository.update(id, updateProductDto);

      expect(isFailure(result)).toBe(true);
      expect(ormRepo.merge).not.toHaveBeenCalled();
      expect(ormRepo.save).not.toHaveBeenCalled();
    });

    it('should return a failure if the database throws an error during update', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(productEntity);
      mockTypeOrmRepository.save.mockRejectedValue(dbError);

      let result = await repository.update(id, updateProductDto);

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

      let result = await repository.findById(1);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual(productEntity);
      }
      expect(ormRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return a failure when the product is not found', async () => {
      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      let result = await repository.findById(999);

      expect(isFailure(result)).toBe(true);
    });

    it('should return a failure if the database throws an error', async () => {
      mockTypeOrmRepository.findOne.mockRejectedValue(dbError);

      let result = await repository.findById(1);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.cause).toBe(dbError);
      }
    });
  });

  describe('findAll', () => {
    it('should return a list of products', async () => {
      let products = [productEntity, { ...productEntity, id: 2 }];
      mockTypeOrmRepository.find.mockResolvedValue(products);

      let result = await repository.findAll();

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(2);
        expect(result.value).toEqual(products);
      }
    });

    it('should return a failure when no products are found', async () => {
      mockTypeOrmRepository.find.mockResolvedValue([]);

      let result = await repository.findAll();

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe('Did not find any products');
      }
    });

    it('should return a failure if the database throws an error', async () => {
      mockTypeOrmRepository.find.mockRejectedValue(dbError);

      let result = await repository.findAll();

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.cause).toBe(dbError);
      }
    });
  });

  describe('deleteById', () => {
    it('should successfully delete an product', async () => {
      mockTypeOrmRepository.delete.mockResolvedValue(undefined);

      let result = await repository.deleteById(1);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBeUndefined();
      }
      expect(ormRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should return a failure if the database throws an error', async () => {
      mockTypeOrmRepository.delete.mockRejectedValue(dbError);

      let result = await repository.deleteById(1);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.cause).toBe(dbError);
      }
    });
  });
});
