// src/modules/products/infrastructure/repositories/PostgresProductRepository/__tests__/postgres.product-repository.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresProductRepository } from './postgres.product-repository';
import { ProductEntity } from '../../orm/product.schema';
import { IdGeneratorService } from '../../../../../core/infrastructure/orm/id-generator.service';
import { IProduct } from '../../../domain/interfaces/IProduct';
import { CreateProductDto } from '../../../presentation/dto/create-product.dto';
import { UpdateProductDto } from '../../../presentation/dto/update-product.dto';

describe('PostgresProductRepository', () => {
  let repository: PostgresProductRepository;
  let ormRepo: jest.Mocked<Repository<ProductEntity>>;
  let idGeneratorService: jest.Mocked<IdGeneratorService>;

  const mockProduct: IProduct = {
    id: 'PR0000001',
    name: 'Test Product',
    description: 'Test Description',
    price: 29.99,
    sku: 'TEST-001',
    stockQuantity: 100,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockProductEntity: ProductEntity = {
    id: 'PR0000001',
    name: 'Test Product',
    description: 'Test Description',
    price: 29.99,
    sku: 'TEST-001',
    stockQuantity: 100,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
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

    const mockIdGenerator = {
      generateProductId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresProductRepository,
        {
          provide: getRepositoryToken(ProductEntity),
          useValue: mockOrmRepo,
        },
        {
          provide: IdGeneratorService,
          useValue: mockIdGenerator,
        },
      ],
    }).compile();

    repository = module.get<PostgresProductRepository>(
      PostgresProductRepository,
    );
    ormRepo = module.get(getRepositoryToken(ProductEntity));
    idGeneratorService = module.get(IdGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    const createProductDto: CreateProductDto = {
      name: 'Test Product',
      description: 'Test Description',
      price: 29.99,
      sku: 'TEST-001',
      stockQuantity: 100,
    };

    it('should successfully save a product', async () => {
      // Arrange
      idGeneratorService.generateProductId.mockResolvedValue('PR0000001');
      ormRepo.create.mockReturnValue(mockProductEntity);
      ormRepo.save.mockResolvedValue(mockProductEntity);

      // Act
      const result = await repository.save(createProductDto);

      // Assert
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toEqual(mockProduct);
      expect(idGeneratorService.generateProductId).toHaveBeenCalledTimes(1);
      expect(ormRepo.create).toHaveBeenCalledWith({
        id: 'PR0000001',
        ...createProductDto,
        createdAt: expect.any(Date),
      });
      expect(ormRepo.save).toHaveBeenCalledWith(mockProductEntity);
    });

    it('should return failure when id generation fails', async () => {
      // Arrange
      const error = new Error('ID generation failed');
      idGeneratorService.generateProductId.mockRejectedValue(error);

      // Act
      const result = await repository.save(createProductDto);

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('Failed to save the product');
      expect(ormRepo.create).not.toHaveBeenCalled();
      expect(ormRepo.save).not.toHaveBeenCalled();
    });

    it('should return failure when database save fails', async () => {
      // Arrange
      const error = new Error('Database save failed');
      idGeneratorService.generateProductId.mockResolvedValue('PR0000001');
      ormRepo.create.mockReturnValue(mockProductEntity);
      ormRepo.save.mockRejectedValue(error);

      // Act
      const result = await repository.save(createProductDto);

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('Failed to save the product');
    });
  });

  describe('update', () => {
    const updateProductDto: UpdateProductDto = {
      name: 'Updated Product',
      price: 39.99,
    };

    it('should successfully update a product', async () => {
      // Arrange
      const updatedEntity = {
        ...mockProductEntity,
        ...updateProductDto,
        updatedAt: new Date(),
      };
      ormRepo.findOne.mockResolvedValue(mockProductEntity);
      ormRepo.merge.mockReturnValue(updatedEntity);
      ormRepo.save.mockResolvedValue(updatedEntity);

      // Act
      const result = await repository.update('PR0000001', updateProductDto);

      // Assert
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.name).toBe('Updated Product');
        expect(result.value.price).toBe(39.99);
      }
      expect(ormRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'PR0000001' },
      });
      expect(ormRepo.merge).toHaveBeenCalledWith(mockProductEntity, {
        ...updateProductDto,
        updatedAt: expect.any(Date),
      });
      expect(ormRepo.save).toHaveBeenCalledWith(updatedEntity);
    });

    it('should return failure when product not found', async () => {
      // Arrange
      ormRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await repository.update('PR0000999', updateProductDto);

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain(
          'Product with ID PR0000999 not found',
        );
      expect(ormRepo.merge).not.toHaveBeenCalled();
      expect(ormRepo.save).not.toHaveBeenCalled();
    });

    it('should return failure when database update fails', async () => {
      // Arrange
      const error = new Error('Database update failed');
      ormRepo.findOne.mockResolvedValue(mockProductEntity);
      ormRepo.merge.mockReturnValue(mockProductEntity);
      ormRepo.save.mockRejectedValue(error);

      // Act
      const result = await repository.update('PR0000001', updateProductDto);

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('Failed to update the product');
    });
  });

  describe('findById', () => {
    it('should successfully find a product by id', async () => {
      // Arrange
      ormRepo.findOne.mockResolvedValue(mockProductEntity);

      // Act
      const result = await repository.findById('PR0000001');

      // Assert
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toEqual(mockProduct);
      expect(ormRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'PR0000001' },
      });
    });

    it('should return failure when product not found', async () => {
      // Arrange
      ormRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await repository.findById('PR0000999');

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('Product not found');
    });

    it('should return failure when database query fails', async () => {
      // Arrange
      const error = new Error('Database query failed');
      ormRepo.findOne.mockRejectedValue(error);

      // Act
      const result = await repository.findById('PR0000001');

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('Failed to find the product');
    });
  });

  describe('findAll', () => {
    it('should successfully find all products', async () => {
      // Arrange
      const mockProducts = [
        mockProductEntity,
        { ...mockProductEntity, id: 'PR0000002', name: 'Product 2' },
      ];
      ormRepo.find.mockResolvedValue(mockProducts);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]).toEqual(mockProduct);
      }
      expect(ormRepo.find).toHaveBeenCalledTimes(1);
    });

    it('should return failure when no products found', async () => {
      // Arrange
      ormRepo.find.mockResolvedValue([]);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('Did not find any products');
    });

    it('should return failure when database query fails', async () => {
      // Arrange
      const error = new Error('Database query failed');
      ormRepo.find.mockRejectedValue(error);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('Failed to find products');
    });
  });

  describe('deleteById', () => {
    it('should successfully delete a product', async () => {
      // Arrange
      ormRepo.delete.mockResolvedValue({ affected: 1, raw: {} });

      // Act
      const result = await repository.deleteById('PR0000001');

      // Assert
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) expect(result.value).toBeUndefined();
      expect(ormRepo.delete).toHaveBeenCalledWith('PR0000001');
    });

    it('should return failure when database delete fails', async () => {
      // Arrange
      const error = new Error('Database delete failed');
      ormRepo.delete.mockRejectedValue(error);

      // Act
      const result = await repository.deleteById('PR0000001');

      // Assert
      expect(result.isFailure).toBe(true);
      if (result.isFailure)
        expect(result.error.message).toContain('Failed to delete the product');
    });
  });
});
