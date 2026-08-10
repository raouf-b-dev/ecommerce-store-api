import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationQueryService } from '../../core/application/ports/notification-query.service';
import { ListNotificationsQuery } from '../../core/application/queries/list-notifications.query';
import { NotificationListItemDTO } from '../../core/application/queries/results/notification-list-item.result';
import { NotificationEntity } from '../orm/notification.schema';
import { RawNotificationListQueryRow } from '../dto/raw-notification-list-query-row.interface';
import { NotificationQueryMapper } from '../mappers/query/notification-query.mapper';
import { PaginatedQueryResult } from '../../../../shared-kernel/domain/interfaces/paginated-query-result.interface';
import { Result } from '../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../shared-kernel/domain/exceptions/query.error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class PostgresNotificationQueryAdapter implements NotificationQueryService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: Repository<NotificationEntity>,
  ) {}

  async list(
    query: ListNotificationsQuery,
  ): Promise<
    Result<PaginatedQueryResult<NotificationListItemDTO>, QueryError>
  > {
    try {
      const { page = 1, limit = 10, userId, targetRole, status } = query;
      const offset = (page - 1) * limit;

      const qb = this.notificationRepo
        .createQueryBuilder('n')
        .select([
          'n.id AS "id"',
          'n.userId AS "userId"',
          'n.targetRole AS "targetRole"',
          'n.type AS "type"',
          'n.title AS "title"',
          'n.message AS "message"',
          'n.payload AS "payload"',
          'n.status AS "status"',
          'n.createdAt AS "createdAt"',
        ]);

      if (userId) {
        qb.andWhere('n.userId = :userId', { userId });
      }

      if (targetRole) {
        qb.andWhere('n.targetRole = :targetRole', { targetRole });
      }

      if (status) {
        qb.andWhere('n.status = :status', { status });
      }

      const totalCountQb = this.notificationRepo.createQueryBuilder('n');
      if (userId) {
        totalCountQb.andWhere('n.userId = :userId', { userId });
      }
      if (targetRole) {
        totalCountQb.andWhere('n.targetRole = :targetRole', { targetRole });
      }
      if (status) {
        totalCountQb.andWhere('n.status = :status', { status });
      }

      const total = await totalCountQb.getCount();

      qb.orderBy('n.createdAt', 'DESC').offset(offset).limit(limit);

      const rawRows: RawNotificationListQueryRow[] = await qb.getRawMany();
      const items = rawRows.map((row) =>
        NotificationQueryMapper.toListItemDto(row),
      );

      return Result.success({
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      return ErrorFactory.QueryError(
        `Failed to fetch notification list: ${(error as Error).message}`,
        error,
      );
    }
  }

  async getById(
    id: string,
  ): Promise<Result<NotificationListItemDTO | null, QueryError>> {
    try {
      const qb = this.notificationRepo
        .createQueryBuilder('n')
        .select([
          'n.id AS "id"',
          'n.userId AS "userId"',
          'n.targetRole AS "targetRole"',
          'n.type AS "type"',
          'n.title AS "title"',
          'n.message AS "message"',
          'n.payload AS "payload"',
          'n.status AS "status"',
          'n.createdAt AS "createdAt"',
        ])
        .where('n.id = :id', { id });

      const rawRow: RawNotificationListQueryRow | undefined =
        await qb.getRawOne();
      if (!rawRow) {
        return Result.success(null);
      }

      return Result.success(NotificationQueryMapper.toListItemDto(rawRow));
    } catch (error) {
      return ErrorFactory.QueryError(
        `Failed to fetch notification for ID ${id}: ${(error as Error).message}`,
        error,
      );
    }
  }
}
