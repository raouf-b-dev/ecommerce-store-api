// src/modules/carts/infrastructure/repositories/redis-cart-repository/redis.cart-repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CartRepository } from '../../../domain/repositories/cart.repository';
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { Result } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { CART_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { RedisCartRepository } from './redis.cart-repository';
import { Cart } from '../../../domain/entities/cart';
import { CartTestFactory } from '../../../testing/factories/cart.factory';
import { CartCacheMapper } from '../../persistence/mappers/cart.mapper';
import { ResultAssertionHelper } from '../../../../../testing';
import { Logger } from '@nestjs/common';

describe('RedisCartRepository', () => {
  let repository: RedisCartRepository;
  let cacheService: jest.Mocked<CacheService>;
  let postgresRepo: jest.Mocked<CartRepository>;

  const mockCart = Cart.fromPrimitives(CartTestFactory.createMockCart());
  const mockCachedCart = CartCacheMapper.toCache(mockCart);

  beforeEach(async () => {
    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
    };

    const mockPostgresRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCustomerId: jest.fn(),
      findBySessionId: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      mergeCarts: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCartRepository,
        { provide: CacheService, useValue: mockCacheService },
        { provide: CartRepository, useValue: mockPostgresRepo },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    repository = module.get<RedisCartRepository>(RedisCartRepository);
    cacheService = module.get(CacheService);
    postgresRepo = module.get(CartRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create cart in postgres and cache', async () => {
      const dto = { customerId: 'cust-123' };
      postgresRepo.create.mockResolvedValue(Result.success(mockCart));
      cacheService.set.mockResolvedValue(undefined);

      const result = await repository.create(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(postgresRepo.create).toHaveBeenCalledWith(dto);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${CART_REDIS.CACHE_KEY}:${mockCart.id}`,
        expect.anything(),
        { ttl: CART_REDIS.EXPIRATION },
      );
    });

    it('should return failure if postgres create fails', async () => {
      const dto = { customerId: 'cust-123' };
      const error = new RepositoryError('Postgres create failed');
      postgresRepo.create.mockResolvedValue(Result.failure(error));

      const result = await repository.create(dto);

      ResultAssertionHelper.assertResultFailureWithError(result, error);
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return cart from cache', async () => {
      cacheService.get.mockResolvedValue(mockCachedCart);

      const result = await repository.findById(mockCart.id);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value.id).toBe(mockCart.id);
      }
      expect(postgresRepo.findById).not.toHaveBeenCalled();
    });

    it('should fetch from postgres and cache if not cached', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(Result.success(mockCart));
      cacheService.set.mockResolvedValue(undefined);

      const result = await repository.findById(mockCart.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('findByCustomerId', () => {
    it('should return cart from cache (search)', async () => {
      cacheService.search.mockResolvedValue([mockCachedCart]);

      const result = await repository.findByCustomerId(mockCart.customerId!);

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value.id).toBe(mockCart.id);
      }
    });

    it('should fetch from postgres and cache if not found in cache', async () => {
      cacheService.search.mockResolvedValue([]);
      postgresRepo.findByCustomerId.mockResolvedValue(Result.success(mockCart));
      cacheService.set.mockResolvedValue(undefined);

      const result = await repository.findByCustomerId(mockCart.customerId!);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('findBySessionId', () => {
    it('should return cart from cache (search)', async () => {
      const sessionCart = Cart.fromPrimitives(
        CartTestFactory.createGuestCart('session-123'),
      );
      const sessionCachedCart = CartCacheMapper.toCache(sessionCart);
      cacheService.search.mockResolvedValue([sessionCachedCart]);

      const result = await repository.findBySessionId('session-123');

      ResultAssertionHelper.assertResultSuccess(result);
      if (result.isSuccess) {
        expect(result.value.sessionId).toBe('session-123');
      }
    });

    it('should fetch from postgres and cache if not found in cache', async () => {
      const sessionCart = Cart.fromPrimitives(
        CartTestFactory.createGuestCart('session-123'),
      );
      cacheService.search.mockResolvedValue([]);
      postgresRepo.findBySessionId.mockResolvedValue(
        Result.success(sessionCart),
      );
      cacheService.set.mockResolvedValue(undefined);

      const result = await repository.findBySessionId('session-123');

      ResultAssertionHelper.assertResultSuccess(result);
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete cart from postgres and cache', async () => {
      postgresRepo.delete.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repository.delete(mockCart.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(cacheService.delete).toHaveBeenCalledWith(
        `${CART_REDIS.CACHE_KEY}:${mockCart.id}`,
      );
    });
  });
});
