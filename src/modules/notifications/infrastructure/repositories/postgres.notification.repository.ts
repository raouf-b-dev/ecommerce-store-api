import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { Notification } from '../../domain/entities/notification';
import { NotificationStatus } from '../../domain/enums/notification-status.enum';
import { NotificationEntity } from '../orm/notification.schema';
import { NotificationMapper } from '../persistence/mappers/notification.mapper';
import { Result } from 'src/core/domain/result';
import { RepositoryError } from 'src/core/errors/repository.error';
import { ErrorFactory } from 'src/core/errors/error.factory';

@Injectable()
export class PostgresNotificationRepository implements NotificationRepository {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: Repository<NotificationEntity>,
  ) {}

  async save(
    notification: Notification,
  ): Promise<Result<void, RepositoryError>> {
    try {
      const entity = NotificationMapper.toEntity(notification);
      await this.notificationRepo.save(entity);
      return Result.success(undefined);
    } catch (err) {
      return ErrorFactory.RepositoryError(
        'Failed to save notification',
        err.message,
      );
    }
  }

  async findById(
    id: string,
  ): Promise<Result<Notification | null, RepositoryError>> {
    try {
      const entity = await this.notificationRepo.findOneBy({ id });
      if (!entity) return Result.success(null);

      return Result.success(NotificationMapper.toDomain(entity));
    } catch (err) {
      return ErrorFactory.RepositoryError(
        'Failed to fetch notification',
        err.message,
      );
    }
  }

  async findByUserId(
    userId: string,
    options?: { page: number; limit: number; status?: string },
  ): Promise<
    Result<
      { data: Notification[]; total: number; unread: number },
      RepositoryError
    >
  > {
    try {
      const page = options?.page ?? 1;
      const limit = options?.limit ?? 20;
      const skip = (page - 1) * limit;

      const where: any = { userId };
      if (options?.status) {
        where.status = options.status;
      }

      const [entities, total] = await this.notificationRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });

      const unreadCount = await this.notificationRepo.count({
        where: { userId, status: NotificationStatus.SENT },
      });

      return Result.success({
        data: NotificationMapper.toDomainArray(entities),
        total,
        unread: unreadCount,
      });
    } catch (err) {
      return ErrorFactory.RepositoryError(
        'Failed to fetch notifications by userId',
        err.message,
      );
    }
  }

  async markAsRead(
    id: string,
    userId: string,
  ): Promise<Result<void, RepositoryError>> {
    try {
      await this.notificationRepo.update(
        { id, userId },
        { status: NotificationStatus.READ },
      );
      return Result.success(undefined);
    } catch (err) {
      return ErrorFactory.RepositoryError(
        'Failed to mark notification as read',
        err.message,
      );
    }
  }

  async deleteExpired(): Promise<Result<void, RepositoryError>> {
    try {
      await this.notificationRepo.delete({
        expiresAt: LessThan(new Date()),
      });
      return Result.success(undefined);
    } catch (err) {
      return ErrorFactory.RepositoryError(
        'Failed to delete expired notifications',
        err.message,
      );
    }
  }
}
