// src/modules/products/infrastructure/repositories/PostgresProductRepository/postgres.product-repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresProductRepository } from './postgres.product-repository';
import { ProductEntity } from '../../orm/product.schema';
import { ProductTestFactory } from '../../../testing/factories/product.factory';
import { CreateProductDtoFactory } from '../../../testing/factories/create-product-dto.factory';
import { UpdateProductDtoFactory } from '../../../testing/factories/update-product-dto.factory';
import { RepositoryError } from '../../../../../shared-kernel/errors/repository.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('PostgresProductRepository', () => {
  let repository: PostgresProductRepository;
  let ormRepo: jest.Mocked<Repository<ProductEntity>>;

  const mockProduct = ProductTestFactory.createMockProduct();
  const mockProductEntity: ProductEntity = {
    id: 1,
    name: mockProduct.name,
    description: mockProduct.description,
    price: mockProduct.price,
    sku: mockProduct.sku,
    createdAt: mockProduct.createdAt,
    updatedAt: mockProduct.updatedAt,
  };

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

  describe('save', () => {
    it('should successfully save a product', async () => {
      const createDto = CreateProductDtoFactory.createMockDto();
      const generatedId = 1;

      ormRepo.create.mockReturnValue(mockProductEntity);
      ormRepo.save.mockResolvedValue({ ...mockProductEntity, id: generatedId });

      const result = await repository.save(createDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(generatedId);
      expect(ormRepo.create).toHaveBeenCalledWith({
        ...createDto,
        createdAt: expect.any(Date),
      });
      expect(ormRepo.save).toHaveBeenCalledWith(mockProductEntity);
    });

    it('should save expensive product', async () => {
      const expensiveDto = CreateProductDtoFactory.createExpensiveProductDto();
      const expensiveProduct = ProductTestFactory.createExpensiveProduct();
      const expensiveEntity = {
        ...mockProductEntity,
        ...expensiveProduct,
        id: 2,
      };

      ormRepo.create.mockReturnValue(expensiveEntity);
      ormRepo.save.mockResolvedValue(expensiveEntity);

      const result = await repository.save(expensiveDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.price).toBe(35000);
    });

    it('should return failure when database save fails', async () => {
      const createDto = CreateProductDtoFactory.createMockDto();
      const error = new Error('Database save failed');

      ormRepo.create.mockReturnValue(mockProductEntity);
      ormRepo.save.mockRejectedValue(error);

      const result = await repository.save(createDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save the product',
        RepositoryError,
      );
    });
  });

  describe('update', () => {
    it('should successfully update a product', async () => {
      const productId = 1;
      const updateDto = UpdateProductDtoFactory.createMockDto();
      const updatedEntity = {
        ...mockProductEntity,
        ...updateDto,
        updatedAt: new Date(),
      };

      ormRepo.findOne.mockResolvedValue(mockProductEntity);
      ormRepo.merge.mockReturnValue(updatedEntity);
      ormRepo.save.mockResolvedValue(updatedEntity);

      const result = await repository.update(productId, updateDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.name).toBe(updateDto.name);
      expect(ormRepo.findOne).toHaveBeenCalledWith({
        where: { id: productId },
      });
      expect(ormRepo.merge).toHaveBeenCalledWith(mockProductEntity, {
        ...updateDto,
        updatedAt: expect.any(Date),
      });
      expect(ormRepo.save).toHaveBeenCalledWith(updatedEntity);
    });

    it('should update only price', async () => {
      const productId = 1;
      const priceOnlyDto = UpdateProductDtoFactory.createPriceOnlyDto(200);
      const updatedEntity = {
        ...mockProductEntity,
        price: 200,
        updatedAt: new Date(),
      };

      ormRepo.findOne.mockResolvedValue(mockProductEntity);
      ormRepo.merge.mockReturnValue(updatedEntity);
      ormRepo.save.mockResolvedValue(updatedEntity);

      const result = await repository.update(productId, priceOnlyDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.price).toBe(200);
    });

    it('should return failure when product not found', async () => {
      const productId = 999;
      const updateDto = UpdateProductDtoFactory.createMockDto();

      ormRepo.findOne.mockResolvedValue(null);

      const result = await repository.update(productId, updateDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        `Product with ID ${productId} not found`,
        RepositoryError,
      );
      expect(ormRepo.merge).not.toHaveBeenCalled();
      expect(ormRepo.save).not.toHaveBeenCalled();
    });

    it('should return failure when database update fails', async () => {
      const productId = 1;
      const updateDto = UpdateProductDtoFactory.createMockDto();
      const error = new Error('Database update failed');

      ormRepo.findOne.mockResolvedValue(mockProductEntity);
      ormRepo.merge.mockReturnValue(mockProductEntity);
      ormRepo.save.mockRejectedValue(error);

      const result = await repository.update(productId, updateDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to update the product',
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
      const mockProducts = ProductTestFactory.createProductList(3);
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

    it('should find products with different stock levels', async () => {
      const products = [
        ProductTestFactory.createInStockProduct(),
        ProductTestFactory.createLowStockProduct(),
        ProductTestFactory.createOutOfStockProduct(),
      ];
      const entities = products.map((p, index) => ({ ...p, id: index + 1 }));

      ormRepo.find.mockResolvedValue(entities);

      const result = await repository.findAll();

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toHaveLength(3);
    });

    it('should return failure when no products found', async () => {
      ormRepo.find.mockResolvedValue([]);

      const result = await repository.findAll();

      ResultAssertionHelper.assertResultFailure(
        result,
        'Did not find any products',
        RepositoryError,
      );
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
