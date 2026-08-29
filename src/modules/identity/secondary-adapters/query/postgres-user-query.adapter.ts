import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
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
import { UserRoleAssignmentEntity } from '../../../authorization/secondary-adapter/orm/user-role-assignment.schema';
import { RoleEntity } from '../../../authorization/secondary-adapter/orm/role.schema';

/**
 * Cross-Context CQRS Read Adapter — Identity users
 *
 * Cross-Context JOIN Rationale:
 * - JOIN users → user_role_assignments → roles (Authorization context):
 *   Resolves roleCode for list/detail and optional role filters in 1 query.
 * Read-only projections never mutate foreign contexts and do not instantiate Domain Aggregates.
 */
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
        roleCode,
        authorizedUserId,
      } = query;

      const offset = (page - 1) * limit;

      const qb = this.userRepo
        .createQueryBuilder('user')
        .leftJoin(
          UserRoleAssignmentEntity,
          'ura',
          'ura.userId = user.id',
        )
        .leftJoin(RoleEntity, 'role', 'role.id = ura.roleId')
        .select([
          'user.id AS "id"',
          'user.firstName AS "firstName"',
          'user.lastName AS "lastName"',
          'user.email AS "email"',
          'user.phone AS "phone"',
          'user.isActive AS "isActive"',
          'role.code AS "roleCode"',
          'user.createdAt AS "createdAt"',
        ]);

      this.applyListFilters(qb, {
        authorizedUserId,
        isActive,
        search,
        roleCode,
      });

      const totalCountQb = this.userRepo
        .createQueryBuilder('user')
        .leftJoin(
          UserRoleAssignmentEntity,
          'ura',
          'ura.userId = user.id',
        )
        .leftJoin(RoleEntity, 'role', 'role.id = ura.roleId');

      this.applyListFilters(totalCountQb, {
        authorizedUserId,
        isActive,
        search,
        roleCode,
      });

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
        .leftJoin(
          UserRoleAssignmentEntity,
          'ura',
          'ura.userId = user.id',
        )
        .leftJoin(RoleEntity, 'role', 'role.id = ura.roleId')
        .select([
          'user.id AS "id"',
          'user.firstName AS "firstName"',
          'user.lastName AS "lastName"',
          'user.email AS "email"',
          'user.phone AS "phone"',
          'user.isActive AS "isActive"',
          'MAX(role.code) AS "roleCode"',
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

  private applyListFilters(
    qb: SelectQueryBuilder<UserEntity>,
    filters: {
      authorizedUserId?: number;
      isActive?: boolean;
      search?: string;
      roleCode?: string;
    },
  ): void {
    const { authorizedUserId, isActive, search, roleCode } = filters;

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

    if (roleCode) {
      qb.andWhere('role.code = :roleCode', { roleCode });
    }
  }
}
