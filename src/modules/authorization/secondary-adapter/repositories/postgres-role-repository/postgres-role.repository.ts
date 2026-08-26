import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { RoleRepository } from '../../../core/domain/repositories/role.repository';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Role } from '../../../core/domain/entities/role';
import { RoleEntity } from '../../orm/role.schema';
import { PermissionEntity } from '../../orm/permission.schema';
import { RolePermissionEntity } from '../../orm/role-permission.schema';
import { RoleMapper } from '../../persistence/mappers/role.mapper';

const ROLE_WITH_PERMISSIONS = [
  'rolePermissions',
  'rolePermissions.permission',
] as const;

@Injectable()
export class PostgresRoleRepository implements RoleRepository {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepo: Repository<RolePermissionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: number): Promise<Result<Role, RepositoryError>> {
    try {
      const entity = await this.roleRepo.findOne({
        where: { id },
        relations: [...ROLE_WITH_PERMISSIONS],
      });
      if (!entity) {
        return ErrorFactory.RepositoryError(`Role with ID ${id} not found`);
      }
      return Result.success(RoleMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find role by ID', error);
    }
  }

  async findByCode(
    code: string,
  ): Promise<Result<Role | null, RepositoryError>> {
    try {
      const entity = await this.roleRepo.findOne({
        where: { code },
        relations: [...ROLE_WITH_PERMISSIONS],
      });
      if (!entity) {
        return Result.success(null);
      }
      return Result.success(RoleMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find role by code', error);
    }
  }

  async findAll(): Promise<Result<Role[], RepositoryError>> {
    try {
      const entities = await this.roleRepo.find({
        order: { id: 'ASC' },
        relations: [...ROLE_WITH_PERMISSIONS],
      });
      return Result.success(entities.map((e) => RoleMapper.toDomain(e)));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find all roles', error);
    }
  }

  async save(role: Role): Promise<Result<Role, RepositoryError>> {
    try {
      const savedId = await this.dataSource.transaction(async (manager) => {
        const roleRepo = manager.getRepository(RoleEntity);
        const entity = Object.assign(
          new RoleEntity(),
          RoleMapper.toInsertPayload(role),
        );
        const savedEntity = await roleRepo.save(entity);
        await this.syncRolePermissions(
          manager,
          savedEntity.id,
          role.permissions.codes,
        );
        return savedEntity.id;
      });

      return await this.findById(savedId);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to save role', error);
    }
  }

  async saveMany(roles: Role[]): Promise<Result<Role[], RepositoryError>> {
    try {
      const results: Role[] = [];
      for (const role of roles) {
        const res = await this.save(role);
        if (res.isFailure) return res;
        results.push(res.value);
      }
      return Result.success(results);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to save roles', error);
    }
  }

  async update(role: Role): Promise<Result<void, RepositoryError>> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const updateResult = await manager.update(
          RoleEntity,
          role.id,
          RoleMapper.toUpdatePayload(role),
        );

        if (!updateResult.affected) {
          throw new RepositoryError('Role not found for update');
        }

        await this.syncRolePermissions(
          manager,
          role.id,
          role.permissions.codes,
        );
      });

      return Result.success(undefined);
    } catch (error) {
      if (error instanceof RepositoryError) {
        return Result.failure(error);
      }
      return ErrorFactory.RepositoryError('Failed to update role', error);
    }
  }

  async delete(id: number): Promise<Result<void, RepositoryError>> {
    try {
      await this.roleRepo.delete(id);
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to delete role', error);
    }
  }

  async findPermissionCodesByRoleCode(
    roleCode: string,
  ): Promise<Result<string[] | null, RepositoryError>> {
    try {
      const role = await this.roleRepo.findOne({
        where: { code: roleCode },
        select: ['id'],
      });

      if (!role) return Result.success(null);

      const entries = await this.rolePermissionRepo.find({
        where: { roleId: role.id },
        relations: ['permission'],
      });

      return Result.success(entries.map((rp) => rp.permission.code));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to fetch permission codes by role code',
        error,
      );
    }
  }

  /**
   * Idempotent join sync (same idea as UserRepository.syncAddresses):
   * delete removed links, insert missing ones — never delete-all + reinsert.
   */
  private async syncRolePermissions(
    manager: EntityManager,
    roleId: number,
    permissionCodes: string[],
  ): Promise<void> {
    const rolePermissionRepo = manager.getRepository(RolePermissionEntity);
    const permissionRepo = manager.getRepository(PermissionEntity);

    const desiredPermissions =
      permissionCodes.length > 0
        ? await permissionRepo.find({ where: { code: In(permissionCodes) } })
        : [];
    const desiredIds = new Set(desiredPermissions.map((p) => p.id));

    const existingLinks = await rolePermissionRepo.find({
      where: { roleId },
    });
    const existingIds = new Set(existingLinks.map((rp) => rp.permissionId));

    const linkIdsToRemove = existingLinks
      .filter((rp) => !desiredIds.has(rp.permissionId))
      .map((rp) => rp.id);
    if (linkIdsToRemove.length > 0) {
      await rolePermissionRepo.delete(linkIdsToRemove);
    }

    const permissionIdsToAdd = [...desiredIds].filter(
      (id) => !existingIds.has(id),
    );
    if (permissionIdsToAdd.length > 0) {
      await rolePermissionRepo.insert(
        permissionIdsToAdd.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      );
    }
  }
}
