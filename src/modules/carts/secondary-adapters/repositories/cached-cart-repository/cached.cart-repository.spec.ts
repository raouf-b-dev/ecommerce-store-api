// src/modules/carts/secondary-adapters/repositories/cached-cart-repository/cached.cart-repository.spec.ts
import { CartTestFactory, MockCartRepository } from 'src/modules/carts/testing';
import { MockCacheService, MockLogger } from 'src/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { CartRepository } from '../../../core/domain/repositories/cart.repository';
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { CART_REDIS } from '../../../../../infrastructure/redis/constants/redis.constants';
import { CachedCartRepository } from './cached.cart-repository';
import { Cart } from '../../../core/domain/entities/cart';
import { ResultAssertionHelper } from '../../../../../testing';
import { Logger } from '@nestjs/common';
import { CachePort } from '../../../../../shared-kernel/domain/interfaces/cache.port';

describe('CachedCartRepository', () => {
  let repository: CachedCartRepository;
  let cacheService: MockCacheService;
  let postgresRepo: MockCartRepository;

  const mockCart = Cart.fromPrimitives(CartTestFactory.createMockCart());

  beforeEach(async () => {
    const mockCacheService = new MockCacheService();
    const mockPostgresRepo = new MockCartRepository();
    const mockLogger = new MockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CachedCartRepository,
        { provide: CachePort, useValue: mockCacheService },
        { provide: CartRepository, useValue: mockPostgresRepo },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    repository = module.get<CachedCartRepository>(CachedCartRepository);
    cacheService = module.get(CachePort);
    postgresRepo = module.get(CartRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findByuserId', () => {
    it('should auto-create a fresh cart if cart is expired/missing from both cache and postgres', async () => {
      cacheService.search.mockResolvedValue([]);
      postgresRepo.findByuserId.mockResolvedValue(
        Result.failure(new RepositoryError('Cart not found')),
      );
      postgresRepo.mockSuccessfulSave();
      cacheService.set.mockResolvedValue(true);

      const result = await repository.findByuserId(mockCart.userId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(postgresRepo.save).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete cart from postgres and cache', async () => {
      postgresRepo.delete.mockResolvedValue(Result.success(undefined));
      cacheService.delete.mockResolvedValue(undefined);

      const result = await repository.delete(mockCart.id!);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(postgresRepo.delete).toHaveBeenCalledWith(mockCart.id);
      expect(cacheService.delete).toHaveBeenCalledWith(
        `${CART_REDIS.CACHE_KEY}:${mockCart.id}`,
      );
    });
  });
});
