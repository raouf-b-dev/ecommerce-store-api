import { CartEntityTestFactory } from 'src/modules/carts/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartEntity } from '../../orm/cart.schema';
import { PostgresCartRepository } from './postgres.cart-repository';
import { Cart } from '../../../core/domain/entities/cart';
import { ResultAssertionHelper } from '../../../../../testing';

describe('PostgresCartRepository', () => {
  let repository: PostgresCartRepository;
  let mockOrmRepo: jest.Mocked<Repository<CartEntity>>;

  const mockCartEntity = CartEntityTestFactory.createCartEntityWithItems();

  beforeEach(async () => {
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
