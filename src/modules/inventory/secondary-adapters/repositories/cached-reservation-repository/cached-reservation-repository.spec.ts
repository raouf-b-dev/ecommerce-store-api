import {
  InventoryBuilder,
  InventoryCommandTestFactory,
  MockReservationRepository,
  ReservationTestFactory,
} from 'src/modules/inventory/testing';
import {
  MockCacheService,
  MockLogger,
  ResultAssertionHelper,
} from 'src/testing';
import { Inventory } from '../../../core/domain/entities/inventory';
import { InventoryCacheMapper } from '../../persistence/mappers/inventory.mapper';
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import {
  INVENTORY_REDIS,
  inventoryIdCacheKey,
  inventoryProductCacheKey,
} from '../../../../../infrastructure/redis/constants/redis.constants';
import { CachedReservationRepository } from './cached-reservation-repository';

describe('CachedReservationRepository', () => {
  let repository: CachedReservationRepository;
  let cacheService: MockCacheService;
  let postgresRepo: MockReservationRepository;
  let logger: MockLogger;

  const cachedInventory = (id: number, productId: number) =>
    InventoryCacheMapper.toCache(
      Inventory.fromPrimitives(
        new InventoryBuilder().withId(id).withProductId(productId).build(),
      ),
    );

  const reservation = ReservationTestFactory.createReservationWithItems([
    { productId: 1, quantity: 2 },
    { productId: 2, quantity: 1 },
  ]);

  beforeEach(() => {
    cacheService = new MockCacheService();
    postgresRepo = new MockReservationRepository();
    logger = new MockLogger();
    repository = new CachedReservationRepository(
      cacheService,
      postgresRepo,
      logger,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('save', () => {
    const dto = InventoryCommandTestFactory.createReservationForOrder(7, 1, 2);

    it('evicts the product and id keys of the reserved inventory after a successful save', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(reservation));
      cacheService.getMany.mockResolvedValue([cachedInventory(11, 1)]);

      const result = await repository.save(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(postgresRepo.save).toHaveBeenCalledWith(dto);
      expect(cacheService.getMany).toHaveBeenCalledWith([
        inventoryProductCacheKey(1),
      ]);
      expect(cacheService.delete).toHaveBeenCalledWith(
        inventoryProductCacheKey(1),
      );
      expect(cacheService.delete).toHaveBeenCalledWith(inventoryIdCacheKey(11));
      expect(cacheService.delete).toHaveBeenCalledWith(
        INVENTORY_REDIS.IS_CACHED_FLAG,
      );
    });

    it('returns the failure and leaves the cache alone when the save fails', async () => {
      postgresRepo.save.mockResolvedValue(
        Result.failure(new RepositoryError('Insufficient stock')),
      );

      const result = await repository.save(dto);

      ResultAssertionHelper.assertResultFailure(result, 'Insufficient stock');
      expect(cacheService.getMany).not.toHaveBeenCalled();
      expect(cacheService.delete).not.toHaveBeenCalled();
    });
  });

  describe.each(['release', 'confirm', 'expire'] as const)('%s', (method) => {
    it('evicts every product in the reservation after a successful write', async () => {
      postgresRepo[method].mockResolvedValue(Result.success(reservation));
      cacheService.getMany.mockResolvedValue([cachedInventory(11, 1), null]);

      const result = await repository[method](reservation);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(postgresRepo[method]).toHaveBeenCalledWith(reservation);
      expect(cacheService.getMany).toHaveBeenCalledWith([
        inventoryProductCacheKey(1),
        inventoryProductCacheKey(2),
      ]);
      expect(cacheService.delete).toHaveBeenCalledWith(
        inventoryProductCacheKey(1),
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        inventoryProductCacheKey(2),
      );
      expect(cacheService.delete).toHaveBeenCalledWith(inventoryIdCacheKey(11));
      expect(cacheService.delete).toHaveBeenCalledTimes(4);
    });

    it('returns the failure and leaves the cache alone when the write fails', async () => {
      postgresRepo[method].mockResolvedValue(
        Result.failure(new RepositoryError('Reservation not found')),
      );

      const result = await repository[method](reservation);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Reservation not found',
      );
      expect(cacheService.getMany).not.toHaveBeenCalled();
      expect(cacheService.delete).not.toHaveBeenCalled();
    });
  });

  describe('cache failures', () => {
    it('keeps the successful write when eviction throws and logs the Redis error', async () => {
      postgresRepo.release.mockResolvedValue(Result.success(reservation));
      cacheService.getMany.mockResolvedValue([]);
      cacheService.delete.mockRejectedValue(new Error('Redis write failed'));

      const result = await repository.release(reservation);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('CachedReservationRepository.evictInventory'),
        expect.any(String),
      );
    });

    it('skips eviction when the cache is unavailable', async () => {
      postgresRepo.confirm.mockResolvedValue(Result.success(reservation));
      cacheService.mockUnavailable();

      const result = await repository.confirm(reservation);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(cacheService.getMany).not.toHaveBeenCalled();
      expect(cacheService.delete).not.toHaveBeenCalled();
    });
  });

  describe('delegated methods', () => {
    it('reads through to postgres without touching the cache', async () => {
      postgresRepo.findById.mockResolvedValue(Result.success(reservation));

      const result = await repository.findById(1);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(postgresRepo.findById).toHaveBeenCalledWith(1);
      expect(cacheService.getMany).not.toHaveBeenCalled();
      expect(cacheService.delete).not.toHaveBeenCalled();
    });

    it('does not evict on update, which writes no inventory rows', async () => {
      postgresRepo.update.mockResolvedValue(Result.success(reservation));

      const result = await repository.update(reservation);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(postgresRepo.update).toHaveBeenCalledWith(reservation);
      expect(cacheService.delete).not.toHaveBeenCalled();
    });
  });
});
