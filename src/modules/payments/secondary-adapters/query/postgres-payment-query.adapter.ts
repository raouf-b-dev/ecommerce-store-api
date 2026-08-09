import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentQueryService } from '../../core/application/ports/payment-query.service';
import { ListPaymentsQuery } from '../../core/application/queries/list-payments.query';
import { PaymentListItemDTO } from '../../core/application/queries/results/payment-list-item.result';
import { PaymentDetailDTO } from '../../core/application/queries/results/payment-detail.result';
import { PaymentEntity } from '../orm/payment.schema';
import { UserEntity } from '../../../identity/secondary-adapters/orm/user.schema';
import { RawPaymentListQueryRow } from '../dto/raw-payment-list-query-row.interface';
import { PaymentQueryMapper } from '../mappers/query/payment-query.mapper';
import { PaginatedQueryResult } from '../../../../shared-kernel/domain/interfaces/paginated-query-result.interface';
import { Result } from '../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../shared-kernel/domain/exceptions/query.error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class PostgresPaymentQueryAdapter implements PaymentQueryService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
  ) {}

  async list(
    query: ListPaymentsQuery,
  ): Promise<Result<PaginatedQueryResult<PaymentListItemDTO>, QueryError>> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        orderId,
        authorizedUserId,
        userEmail,
        userName,
        sortBy = 'createdAt',
        sortDirection = 'desc',
        sortOrder,
      } = query;

      const offset = (page - 1) * limit;

      const qb = this.paymentRepo
        .createQueryBuilder('payment')
        .leftJoin(UserEntity, 'user', 'user.id = payment.userId')
        .select([
          'payment.id AS "id"',
          'payment.orderId AS "orderId"',
          'payment.userId AS "userId"',
          "COALESCE(user.firstName || ' ' || user.lastName, 'Unknown User') AS \"userName\"",
          'COALESCE(user.email, \'\') AS "userEmail"',
          'payment.amount AS "amount"',
          'payment.currency AS "currency"',
          'payment.status AS "status"',
          'payment.paymentMethod AS "paymentMethod"',
          'payment.transactionId AS "transactionId"',
          'payment.createdAt AS "createdAt"',
        ]);

      if (authorizedUserId) {
        qb.andWhere('payment.userId = :authorizedUserId', { authorizedUserId });
      }

      if (status) {
        qb.andWhere('payment.status = :status', { status });
      }

      if (orderId) {
        qb.andWhere('payment.orderId = :orderId', { orderId });
      }

      if (userEmail) {
        qb.andWhere('user.email ILIKE :userEmail', {
          userEmail: `%${userEmail}%`,
        });
      }

      if (userName) {
        qb.andWhere(
          '(user.firstName ILIKE :userName OR user.lastName ILIKE :userName)',
          { userName: `%${userName}%` },
        );
      }

      const totalCountQb = this.paymentRepo.createQueryBuilder('payment');
      if (authorizedUserId) {
        totalCountQb.andWhere('payment.userId = :authorizedUserId', {
          authorizedUserId,
        });
      }

      if (status) {
        totalCountQb.andWhere('payment.status = :status', { status });
      }

      if (orderId) {
        totalCountQb.andWhere('payment.orderId = :orderId', { orderId });
      }

      if (userEmail || userName) {
        totalCountQb.leftJoin(UserEntity, 'user', 'user.id = payment.userId');
        if (userEmail) {
          totalCountQb.andWhere('user.email ILIKE :userEmail', {
            userEmail: `%${userEmail}%`,
          });
        }
        if (userName) {
          totalCountQb.andWhere(
            '(user.firstName ILIKE :userName OR user.lastName ILIKE :userName)',
            { userName: `%${userName}%` },
          );
        }
      }

      const total = await totalCountQb.getCount();

      const validSortColumns: Record<string, string> = {
        createdAt: 'payment.createdAt',
        amount: 'payment.amount',
        status: 'payment.status',
        id: 'payment.id',
      };

      const sortCol =
        validSortColumns[sortBy || 'createdAt'] || 'payment.createdAt';
      const rawDir = sortDirection || sortOrder || 'desc';
      const orderDir = rawDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      qb.orderBy(sortCol, orderDir).offset(offset).limit(limit);

      const rawRows: RawPaymentListQueryRow[] = await qb.getRawMany();
      const items = rawRows.map((row) => PaymentQueryMapper.toListItemDto(row));

      return Result.success({
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      return ErrorFactory.QueryError(
        `Failed to fetch payment list: ${(error as Error).message}`,
        error,
      );
    }
  }

  async getById(
    id: number,
    authorizedUserId?: number,
  ): Promise<Result<PaymentDetailDTO | null, QueryError>> {
    try {
      const qb = this.paymentRepo
        .createQueryBuilder('payment')
        .leftJoin(UserEntity, 'user', 'user.id = payment.userId')
        .select([
          'payment.id AS "id"',
          'payment.orderId AS "orderId"',
          'payment.userId AS "userId"',
          "COALESCE(user.firstName || ' ' || user.lastName, 'Unknown User') AS \"userName\"",
          'COALESCE(user.email, \'\') AS "userEmail"',
          'payment.amount AS "amount"',
          'payment.currency AS "currency"',
          'payment.status AS "status"',
          'payment.paymentMethod AS "paymentMethod"',
          'payment.transactionId AS "transactionId"',
          'payment.failureReason AS "failureReason"',
          'payment.paymentMethodInfo AS "metadata"',
          'payment.createdAt AS "createdAt"',
          'payment.updatedAt AS "updatedAt"',
        ])
        .where('payment.id = :id', { id });

      if (authorizedUserId) {
        qb.andWhere('payment.userId = :authorizedUserId', { authorizedUserId });
      }

      const rawRow: RawPaymentListQueryRow | undefined = await qb.getRawOne();
      if (!rawRow) {
        return Result.success(null);
      }

      return Result.success(PaymentQueryMapper.toDetailDto(rawRow));
    } catch (error) {
      return ErrorFactory.QueryError(
        `Failed to fetch payment details for ID ${id}: ${(error as Error).message}`,
        error,
      );
    }
  }

  async getByOrderId(
    orderId: number,
    authorizedUserId?: number,
  ): Promise<Result<PaymentDetailDTO | null, QueryError>> {
    try {
      const qb = this.paymentRepo
        .createQueryBuilder('payment')
        .leftJoin(UserEntity, 'user', 'user.id = payment.userId')
        .select([
          'payment.id AS "id"',
          'payment.orderId AS "orderId"',
          'payment.userId AS "userId"',
          "COALESCE(user.firstName || ' ' || user.lastName, 'Unknown User') AS \"userName\"",
          'COALESCE(user.email, \'\') AS "userEmail"',
          'payment.amount AS "amount"',
          'payment.currency AS "currency"',
          'payment.status AS "status"',
          'payment.paymentMethod AS "paymentMethod"',
          'payment.transactionId AS "transactionId"',
          'payment.failureReason AS "failureReason"',
          'payment.paymentMethodInfo AS "metadata"',
          'payment.createdAt AS "createdAt"',
          'payment.updatedAt AS "updatedAt"',
        ])
        .where('payment.orderId = :orderId', { orderId });

      if (authorizedUserId) {
        qb.andWhere('payment.userId = :authorizedUserId', { authorizedUserId });
      }

      const rawRow: RawPaymentListQueryRow | undefined = await qb.getRawOne();
      if (!rawRow) {
        return Result.success(null);
      }

      return Result.success(PaymentQueryMapper.toDetailDto(rawRow));
    } catch (error) {
      return ErrorFactory.QueryError(
        `Failed to fetch payment details for order ID ${orderId}: ${(error as Error).message}`,
        error,
      );
    }
  }
}
