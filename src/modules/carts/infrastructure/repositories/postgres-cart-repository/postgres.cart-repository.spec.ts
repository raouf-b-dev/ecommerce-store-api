// src/modules/carts/infrastructure/repositories/postgres-cart-repository/postgres.cart-repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartEntity } from '../../orm/cart.schema';
import { PostgresCartRepository } from './postgres.cart-repository';
import { Cart } from '../../../domain/entities/cart';
import { CartEntityTestFactory } from '../../../testing/factories/cart-entity.factory';
import { CartTestFactory } from '../../../testing/factories/cart.factory';
import { ResultAssertionHelper } from '../../../../../testing';

describe('PostgresCartRepository', () => {
  let repository: PostgresCartRepository;
  let mockOrmRepo: jest.Mocked<Repository<CartEntity>>;

  const mockCartEntity = CartEntityTestFactory.createCartEntityWithItems();
  const mockCart = Cart.fromPrimitives(
    CartTestFactory.createMockCart({
      id: mockCartEntity.id,
      customerId: mockCartEntity.customerId,
    }),
  );

  beforeEach(async () => {
    mockOrmRepo = {
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresCartRepository,
        { provide: getRepositoryToken(CartEntity), useValue: mockOrmRepo },
      ],
    }).compile();

    repository = module.get<PostgresCartRepository>(PostgresCartRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create cart successfully', async () => {
      const dto = { customerId: 123 };
      mockOrmRepo.save.mockResolvedValue(mockCartEntity);

      const result = await repository.create(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockOrmRepo.save).toHaveBeenCalled();
    });

    it('should return error on DB failure', async () => {
      const dto = { customerId: 123 };
      mockOrmRepo.save.mockRejectedValue(new Error('DB Error'));

      const result = await repository.create(dto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to create cart',
      );
    });
  });

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

  describe('findByCustomerId', () => {
    it('should find cart by customerId successfully', async () => {
      mockOrmRepo.findOne.mockResolvedValue(mockCartEntity);

      const result = await repository.findByCustomerId(
        mockCartEntity.customerId!,
      );

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value.customerId).toBe(mockCartEntity.customerId);
      }
    });

    it('should return error if cart not found', async () => {
      mockOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findByCustomerId(0);

      ResultAssertionHelper.assertResultFailure(result, 'Cart not found');
    });
  });

  describe('findBySessionId', () => {
    it('should find cart by sessionId successfully', async () => {
      const sessionCartEntity = CartEntityTestFactory.createCartEntity({
        sessionId: 123,
        customerId: null,
      });
      mockOrmRepo.findOne.mockResolvedValue(sessionCartEntity);

      const result = await repository.findBySessionId(123);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value.sessionId).toBe(123);
      }
    });

    it('should return error if cart not found', async () => {
      mockOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findBySessionId(0);

      ResultAssertionHelper.assertResultFailure(result, 'Cart not found');
    });
  });

  describe('delete', () => {
    it('should delete cart successfully', async () => {
      mockOrmRepo.delete.mockResolvedValue({ raw: [], affected: 1 });

      const result = await repository.delete(mockCartEntity.id);

      ResultAssertionHelper.assertResultSuccess(result);
    });

    it('should return error if cart not found', async () => {
      mockOrmRepo.delete.mockResolvedValue({ raw: [], affected: 0 });

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
