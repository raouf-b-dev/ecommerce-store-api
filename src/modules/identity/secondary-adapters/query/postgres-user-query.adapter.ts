import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserQueryService } from '../../core/application/ports/user-query.service';
import { ListUsersQuery } from '../../core/application/queries/list-users.query';
import { UserListItemDTO } from '../../core/application/queries/results/user-list-item.result';
import { UserDetailDTO } from '../../core/application/queries/results/user-detail.result';
import { UserEntity } from '../orm/user.schema';
import { RawUserListQueryRow } from '../dto/raw-user-list-query-row.interface';
import { UserQueryMapper } from '../mappers/query/user-query.mapper';
import { PaginatedQueryResult } from '../../../../shared-kernel/domain/interfaces/paginated-query-result.interface';
import { Result } from '../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../shared-kernel/domain/exceptions/query.error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class PostgresUserQueryAdapter implements UserQueryService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async list(
    query: ListUsersQuery,
  ): Promise<Result<PaginatedQueryResult<UserListItemDTO>, QueryError>> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        isActive,
        authorizedUserId,
      } = query;

      const offset = (page - 1) * limit;

      const qb = this.userRepo
        .createQueryBuilder('user')
        .select([
          'user.id AS "id"',
          'user.firstName AS "firstName"',
          'user.lastName AS "lastName"',
          'user.email AS "email"',
          'user.phone AS "phone"',
          'user.isActive AS "isActive"',
          'user.createdAt AS "createdAt"',
        ]);

      if (authorizedUserId) {
        qb.andWhere('user.id = :authorizedUserId', { authorizedUserId });
      }

      if (isActive !== undefined) {
        qb.andWhere('user.isActive = :isActive', { isActive });
      }

      if (search) {
        qb.andWhere(
          '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
          { search: `%${search}%` },
        );
      }

      const totalCountQb = this.userRepo.createQueryBuilder('user');
      if (authorizedUserId) {
        totalCountQb.andWhere('user.id = :authorizedUserId', {
          authorizedUserId,
        });
      }
      if (isActive !== undefined) {
        totalCountQb.andWhere('user.isActive = :isActive', { isActive });
      }
      if (search) {
        totalCountQb.andWhere(
          '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
          { search: `%${search}%` },
        );
      }

      const total = await totalCountQb.getCount();

      qb.orderBy('user.createdAt', 'DESC').offset(offset).limit(limit);

      const rawRows: RawUserListQueryRow[] = await qb.getRawMany();
      const items = rawRows.map((row) => UserQueryMapper.toListItemDto(row));

      return Result.success({
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      return ErrorFactory.QueryError(
        `Failed to fetch user list: ${(error as Error).message}`,
        error,
      );
    }
  }

  async getById(
    id: number,
    authorizedUserId?: number,
  ): Promise<Result<UserDetailDTO | null, QueryError>> {
    try {
      const qb = this.userRepo
        .createQueryBuilder('user')
        .leftJoin('user.addresses', 'address')
        .select([
          'user.id AS "id"',
          'user.firstName AS "firstName"',
          'user.lastName AS "lastName"',
          'user.email AS "email"',
          'user.phone AS "phone"',
          'user.isActive AS "isActive"',
          'user.createdAt AS "createdAt"',
          'user.updatedAt AS "updatedAt"',
          'COUNT(address.id) AS "addressCount"',
        ])
        .where('user.id = :id', { id })
        .groupBy('user.id');

      if (authorizedUserId) {
        qb.andWhere('user.id = :authorizedUserId', { authorizedUserId });
      }

      const rawRow: RawUserListQueryRow | undefined = await qb.getRawOne();
      if (!rawRow) {
        return Result.success(null);
      }

      return Result.success(UserQueryMapper.toDetailDto(rawRow));
    } catch (error) {
      return ErrorFactory.QueryError(
        `Failed to fetch user details for ID ${id}: ${(error as Error).message}`,
        error,
      );
    }
  }
}
