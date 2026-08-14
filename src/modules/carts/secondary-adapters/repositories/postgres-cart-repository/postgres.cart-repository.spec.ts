import { CartEntityTestFactory } from 'src/modules/carts/testing';
import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CartEntity } from '../../orm/cart.schema';
import { PostgresCartRepository } from './postgres.cart-repository';
import { Cart } from '../../../core/domain/entities/cart';
import { ResultAssertionHelper } from '../../../../../testing';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { CartMapper } from '../../persistence/mappers/cart.mapper';
import {
  createMockDataSource,
  createMockQueryBuilder,
  createMockTransactionManager,
} from '../../../../../testing/mocks/typeorm.mocks';

describe('PostgresCartRepository', () => {
  let repository: PostgresCartRepository;
  let mockOrmRepo: jest.Mocked<Repository<CartEntity>>;
  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder<CartEntity>>;
  let mockTransactionManager: ReturnType<typeof createMockTransactionManager>;

  const mockCartEntity = CartEntityTestFactory.createCartEntityWithItems();

  beforeEach(async () => {
    mockQueryBuilder = createMockQueryBuilder<CartEntity>();
    mockTransactionManager = createMockTransactionManager({
      mockQueryBuilder,
    });
    const mockDataSource = createMockDataSource(mockTransactionManager);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresCartRepository,
        {
          provide: getRepositoryToken(CartEntity),
          useValue: {
            save: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    repository = module.get<PostgresCartRepository>(PostgresCartRepository);
    mockOrmRepo = module.get(getRepositoryToken(CartEntity));
  });

  afterEach(() => jest.clearAllMocks());

  describe('findById', () => {
    it('should find cart by id successfully', async () => {
      mockOrmRepo.findOne.mockResolvedValue(mockCartEntity);

      const result = await repository.findById(mockCartEntity.id);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value).toBeInstanceOf(Cart);
        expect(result.value.id).toBe(mockCartEntity.id);
      }
    });

    it('should return error if cart not found', async () => {
      mockOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById(123);

      ResultAssertionHelper.assertResultFailure(result, 'Cart not found');
    });

    it('should return error on DB failure', async () => {
      mockOrmRepo.findOne.mockRejectedValue(new Error('DB Error'));

      const result = await repository.findById(mockCartEntity.id);

      ResultAssertionHelper.assertResultFailure(result, 'Failed to find cart');
    });
  });

  describe('findByuserId', () => {
    it('should find cart by userId successfully', async () => {
      mockOrmRepo.findOne.mockResolvedValue(mockCartEntity);

      const result = await repository.findByuserId(mockCartEntity.userId);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value.userId).toBe(mockCartEntity.userId);
      }
    });

    it('should return error if cart not found', async () => {
      mockOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findByuserId(0);

      ResultAssertionHelper.assertResultFailure(result, 'Cart not found');
    });
  });

  describe('save', () => {
    it('should insert via save when expectedVersion is omitted', async () => {
      mockOrmRepo.save.mockResolvedValue(mockCartEntity);
      const cart = CartMapper.toDomain(mockCartEntity);

      const result = await repository.save(cart);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrmRepo.save).toHaveBeenCalled();
    });

    it('should OCC-update with WHERE version when expectedVersion is provided', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ raw: [], affected: 1 });
      mockTransactionManager.find.mockResolvedValue(mockCartEntity.items);
      mockOrmRepo.findOne.mockResolvedValue(mockCartEntity);
      const cart = CartMapper.toDomain(mockCartEntity);

      const result = await repository.save(cart, 1);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrmRepo.save).not.toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(CartEntity);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'id = :id AND version = :expectedVersion',
        { id: cart.id, expectedVersion: 1 },
      );
    });

    it('should return conflict when OCC update affects 0 rows and the cart exists', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ raw: [], affected: 0 });
      mockTransactionManager.findOne.mockResolvedValue(mockCartEntity);
      const cart = CartMapper.toDomain(mockCartEntity);

      const result = await repository.save(cart, 1);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Optimistic lock failure',
        RepositoryError,
      );
      if (result.isFailure) {
        expect(result.error.statusCode).toBe(HttpStatus.CONFLICT);
      }
    });

    it('should return not-found when OCC update affects 0 rows and the cart is missing', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ raw: [], affected: 0 });
      mockTransactionManager.findOne.mockResolvedValue(null);
      const cart = CartMapper.toDomain(mockCartEntity);

      const result = await repository.save(cart, 1);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Cart not found',
        RepositoryError,
      );
    });
  });

  describe('delete', () => {
    it('should delete cart successfully', async () => {
      mockOrmRepo.delete.mockResolvedValue({
        raw: [],
        affected: 1,
      });

      const result = await repository.delete(mockCartEntity.id);

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return error if cart not found', async () => {
      mockOrmRepo.delete.mockResolvedValue({
        raw: [],
        affected: 0,
      });

      const result = await repository.delete(0);

      ResultAssertionHelper.assertResultFailure(result, 'Cart not found');
    });

    it('should return error on DB failure', async () => {
      mockOrmRepo.delete.mockRejectedValue(new Error('DB Error'));

      const result = await repository.delete(mockCartEntity.id);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to delete cart',
      );
    });
  });
});
