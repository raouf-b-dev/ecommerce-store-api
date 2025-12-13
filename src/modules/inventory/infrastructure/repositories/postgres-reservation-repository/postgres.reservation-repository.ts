import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, DataSource, In } from 'typeorm';
import { ReservationRepository } from '../../../domain/repositories/reservation.repository';
import { Reservation } from '../../../domain/entities/reservation';
import { ReservationEntity } from '../../orm/reservation.schema';
import { ReservationMapper } from '../../persistence/mappers/reservation.mapper';
import { Result } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ReservationStatus } from '../../../domain/value-objects/reservation-status';
import { InventoryEntity } from '../../orm/inventory.schema';

import { IdGeneratorService } from '../../../../../core/infrastructure/orm/id-generator.service';
import { ReserveStockDto } from '../../../presentation/dto/reserve-stock.dto';

@Injectable()
export class PostgresReservationRepository implements ReservationRepository {
  constructor(
    @InjectRepository(ReservationEntity)
    private readonly repository: Repository<ReservationEntity>,
    private readonly dataSource: DataSource,
    private readonly idGeneratorService: IdGeneratorService,
  ) {}

  async save(
    dto: ReserveStockDto,
  ): Promise<Result<Reservation, RepositoryError>> {
    try {
      const reservationId =
        await this.idGeneratorService.generateReservationId();

      const reservationResult = Reservation.create({
        id: reservationId,
        orderId: dto.orderId,
        items: dto.items.map((item) => ({
          ...item,
          id: null,
        })),
        ttlMinutes: 15, // Default TTL
      });

      if (reservationResult.isFailure) {
        return ErrorFactory.RepositoryError(
          'Failed to create reservation entity',
          reservationResult.error,
        );
      }

      const reservation = reservationResult.value;

      const savedReservation = await this.dataSource.transaction(
        async (manager) => {
          // 1. Check and Update Inventory
          const items = reservation.items;
          const productIds = items.map((i) => i.productId);

          // Lock inventory rows for update
          const inventoryItems = await manager.find(InventoryEntity, {
            where: { productId: In(productIds) },
            lock: { mode: 'pessimistic_write' },
          });

          const inventoryMap = new Map(
            inventoryItems.map((i) => [i.productId, i]),
          );

          for (const item of items) {
            const inventory = inventoryMap.get(item.productId);
            if (!inventory) {
              throw new RepositoryError(
                `Inventory not found for product ${item.productId}`,
              );
            }

            if (inventory.availableQuantity < item.quantity) {
              throw new RepositoryError(
                `Insufficient stock for product ${item.productId}`,
              );
            }

            inventory.availableQuantity -= item.quantity;
            inventory.reservedQuantity += item.quantity;
            await manager.save(inventory);
          }

          // 2. Save Reservation
          const entity = ReservationMapper.toEntity(reservation);
          return await manager.save(entity);
        },
      );

      return Result.success(ReservationMapper.toDomain(savedReservation));
    } catch (error) {
      if (error instanceof RepositoryError) {
        return Result.failure(error);
      }
      return ErrorFactory.RepositoryError('Failed to save reservation', error);
    }
  }

  async findById(id: string): Promise<Result<Reservation, RepositoryError>> {
    try {
      const entity = await this.repository.findOne({ where: { id } });
      if (!entity) {
        return ErrorFactory.RepositoryError('Reservation not found');
      }
      return Result.success(ReservationMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find reservation', error);
    }
  }

  async findByOrderId(
    orderId: string,
  ): Promise<Result<Reservation, RepositoryError>> {
    try {
      const entity = await this.repository.findOne({ where: { orderId } });
      if (!entity) {
        return ErrorFactory.RepositoryError('Reservation not found');
      }
      return Result.success(ReservationMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find reservation', error);
    }
  }

  async update(
    reservation: Reservation,
  ): Promise<Result<Reservation, RepositoryError>> {
    try {
      const entity = ReservationMapper.toEntity(reservation);
      const savedEntity = await this.repository.save(entity);
      return Result.success(ReservationMapper.toDomain(savedEntity));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to update reservation',
        error,
      );
    }
  }

  async findPendingExpired(
    date: Date,
  ): Promise<Result<Reservation[], RepositoryError>> {
    try {
      const entities = await this.repository.find({
        where: {
          status: ReservationStatus.PENDING,
          expiresAt: LessThan(date),
        },
      });
      return Result.success(entities.map(ReservationMapper.toDomain));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find expired reservations',
        error,
      );
    }
  }

  async release(
    reservation: Reservation,
  ): Promise<Result<Reservation, RepositoryError>> {
    try {
      const savedReservation = await this.dataSource.transaction(
        async (manager) => {
          // Check current status in DB
          const currentEntity = await manager.findOne(ReservationEntity, {
            where: { id: reservation.id },
            lock: { mode: 'pessimistic_write' },
          });

          if (!currentEntity) {
            throw new RepositoryError('Reservation not found');
          }

          if (
            currentEntity.status === ReservationStatus.RELEASED ||
            currentEntity.status === ReservationStatus.EXPIRED
          ) {
            return currentEntity; // Already released/expired
          }

          // Restore Inventory
          const items = reservation.items;
          const productIds = items.map((i) => i.productId);
          const inventoryItems = await manager.find(InventoryEntity, {
            where: { productId: In(productIds) },
            lock: { mode: 'pessimistic_write' },
          });
          const inventoryMap = new Map(
            inventoryItems.map((i) => [i.productId, i]),
          );

          for (const item of items) {
            const inventory = inventoryMap.get(item.productId);
            if (inventory) {
              inventory.availableQuantity += item.quantity;
              inventory.reservedQuantity -= item.quantity;
              await manager.save(inventory);
            }
          }

          // Update Reservation Status
          const entity = ReservationMapper.toEntity(reservation);
          // Ensure we are setting the status to what the domain object has (RELEASED/EXPIRED)
          // The domain object passed in should already have the new status.
          return await manager.save(entity);
        },
      );
      return Result.success(ReservationMapper.toDomain(savedReservation));
    } catch (error) {
      if (error instanceof RepositoryError) {
        return Result.failure(error);
      }
      return ErrorFactory.RepositoryError(
        'Failed to release reservation',
        error,
      );
    }
  }

  async confirm(
    reservation: Reservation,
  ): Promise<Result<Reservation, RepositoryError>> {
    try {
      const savedReservation = await this.dataSource.transaction(
        async (manager) => {
          const currentEntity = await manager.findOne(ReservationEntity, {
            where: { id: reservation.id },
            lock: { mode: 'pessimistic_write' },
          });

          if (!currentEntity) {
            throw new RepositoryError('Reservation not found');
          }

          if (currentEntity.status === ReservationStatus.CONFIRMED) {
            return currentEntity;
          }

          const items = reservation.items;
          const productIds = items.map((i) => i.productId);
          const inventoryItems = await manager.find(InventoryEntity, {
            where: { productId: In(productIds) },
            lock: { mode: 'pessimistic_write' },
          });
          const inventoryMap = new Map(
            inventoryItems.map((i) => [i.productId, i]),
          );

          for (const item of items) {
            const inventory = inventoryMap.get(item.productId);
            if (inventory) {
              inventory.reservedQuantity -= item.quantity;
              await manager.save(inventory);
            }
          }

          const entity = ReservationMapper.toEntity(reservation);
          return await manager.save(entity);
        },
      );
      return Result.success(ReservationMapper.toDomain(savedReservation));
    } catch (error) {
      if (error instanceof RepositoryError) {
        return Result.failure(error);
      }
      return ErrorFactory.RepositoryError(
        'Failed to confirm reservation',
        error,
      );
    }
  }
}
