import { Injectable, Logger } from '@nestjs/common';
import {
  ReservationInput,
  ReservationItemInput,
  ReservationRepository,
} from '../../../core/domain/repositories/reservation.repository';
import { Reservation } from '../../../core/domain/entities/reservation';
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { CachePort } from '../../../../../shared-kernel/domain/interfaces/cache.port';
import {
  INVENTORY_REDIS,
  inventoryIdCacheKey,
  inventoryProductCacheKey,
} from '../../../../../infrastructure/redis/constants/redis.constants';
import { logRedisError } from '../../../../../infrastructure/redis/redis-error.utils';
import { InventoryForCache } from '../../persistence/mappers/inventory.mapper';

/**
 * Evicts the cached inventory documents that a reservation write changed.
 * Each Postgres write owns its transaction, so eviction runs after commit.
 */
@Injectable()
export class CachedReservationRepository implements ReservationRepository {
  constructor(
    private readonly cacheService: CachePort,
    private readonly postgresRepo: ReservationRepository,
    private readonly logger: Logger,
  ) {}

  async save(
    dto: ReservationInput,
  ): Promise<Result<Reservation, RepositoryError>> {
    const result = await this.postgresRepo.save(dto);
    if (result.isSuccess) {
      await this.evictInventory(dto.items);
    }
    return result;
  }

  async release(
    reservation: Reservation,
  ): Promise<Result<Reservation, RepositoryError>> {
    const result = await this.postgresRepo.release(reservation);
    if (result.isSuccess) {
      await this.evictInventory(reservation.items);
    }
    return result;
  }

  async confirm(
    reservation: Reservation,
  ): Promise<Result<Reservation, RepositoryError>> {
    const result = await this.postgresRepo.confirm(reservation);
    if (result.isSuccess) {
      await this.evictInventory(reservation.items);
    }
    return result;
  }

  async expire(
    reservation: Reservation,
  ): Promise<Result<Reservation, RepositoryError>> {
    const result = await this.postgresRepo.expire(reservation);
    if (result.isSuccess) {
      await this.evictInventory(reservation.items);
    }
    return result;
  }

  findById(id: number): Promise<Result<Reservation, RepositoryError>> {
    return this.postgresRepo.findById(id);
  }

  findByOrderId(
    orderId: number,
  ): Promise<Result<Reservation, RepositoryError>> {
    return this.postgresRepo.findByOrderId(orderId);
  }

  findAllByOrderId(
    orderId: number,
  ): Promise<Result<Reservation[], RepositoryError>> {
    return this.postgresRepo.findAllByOrderId(orderId);
  }

  update(
    reservation: Reservation,
  ): Promise<Result<Reservation, RepositoryError>> {
    return this.postgresRepo.update(reservation);
  }

  findPendingExpired(
    date: Date,
    limit?: number,
    excludeIds?: number[],
  ): Promise<Result<Reservation[], RepositoryError>> {
    return this.postgresRepo.findPendingExpired(date, limit, excludeIds);
  }

  sumPendingReservedByProductIds(
    productIds: number[],
    asOfDate?: Date,
  ): Promise<Result<Map<number, number>, RepositoryError>> {
    return this.postgresRepo.sumPendingReservedByProductIds(
      productIds,
      asOfDate,
    );
  }

  private async evictInventory(
    items: ReadonlyArray<ReservationItemInput>,
  ): Promise<void> {
    if (!this.cacheService.isAvailable()) {
      return;
    }

    const productKeys = [...new Set(items.map((item) => item.productId))].map(
      (productId) => inventoryProductCacheKey(productId),
    );
    if (productKeys.length === 0) {
      return;
    }

    try {
      // The id key comes from the cached product document (no extra DB query).
      const cached =
        await this.cacheService.getMany<InventoryForCache>(productKeys);
      const idKeys = cached.flatMap((doc) =>
        doc && typeof doc.id === 'number' ? [inventoryIdCacheKey(doc.id)] : [],
      );

      await Promise.all(
        [...productKeys, ...idKeys].map((key) => this.cacheService.delete(key)),
      );
      await this.cacheService.delete(INVENTORY_REDIS.IS_CACHED_FLAG);
    } catch (error) {
      logRedisError(
        this.logger,
        'CachedReservationRepository.evictInventory',
        error,
      );
    }
  }
}
