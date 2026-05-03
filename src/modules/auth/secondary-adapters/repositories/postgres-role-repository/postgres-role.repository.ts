import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RoleRepository } from '../../../core/domain/repositories/role.repository';
import { RoleEntity } from '../../orm/role.schema';
import { PermissionEntity } from '../../orm/permission.schema';
import { RolePermissionEntity } from '../../orm/role-permission.schema';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Role } from '../../../core/domain/entities/role';

@Injectable()
export class PostgresRoleRepository implements RoleRepository {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepo: Repository<PermissionEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepo: Repository<RolePermissionEntity>,
  ) {}

  private toDomain(entity: RoleEntity): Role {
    const permissionCodes =
      entity.rolePermissions?.map((rp) => rp.permission.code) || [];
    return new Role({
      id: entity.id,
      code: entity.code,
      name: entity.name,
      isSystem: entity.isSystem,
      permissions: permissionCodes,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async findById(id: number): Promise<Result<Role, RepositoryError>> {
    try {
      const entity = await this.roleRepo.findOne({
        where: { id },
        relations: ['rolePermissions', 'rolePermissions.permission'],
      });
      if (!entity) {
        return ErrorFactory.RepositoryError(`Role with ID ${id} not found`);
      }
      return Result.success(this.toDomain(entity));
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
        relations: ['rolePermissions', 'rolePermissions.permission'],
      });
      if (!entity) {
        return Result.success(null);
      }
      return Result.success(this.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find role by code', error);
    }
  }

  async findAll(): Promise<Result<Role[], RepositoryError>> {
    try {
      const entities = await this.roleRepo.find({
        order: { id: 'ASC' },
        relations: ['rolePermissions', 'rolePermissions.permission'],
      });
      return Result.success(entities.map((e) => this.toDomain(e)));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find all roles', error);
    }
  }

  async save(role: Role): Promise<Result<Role, RepositoryError>> {
    try {
      const entityToSave = this.roleRepo.create({
        id: role.id,
        code: role.code,
        name: role.name,
        isSystem: role.isSystem,
      });

      const savedEntity = await this.roleRepo.save(entityToSave);

      const codes = role.permissions.codes;
      if (codes.length > 0) {
        const permissions = await this.permissionRepo.find({
          where: { code: In(codes) },
        });
        await this.rolePermissionRepo.save(
          permissions.map((p) => ({
            roleId: savedEntity.id,
            permissionId: p.id,
          })),
        );
      }

      return (await this.findById(savedEntity.id)) as any;
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
      const entityToUpdate = await this.roleRepo.findOne({
        where: { id: role.id },
      });

      if (!entityToUpdate) {
        return ErrorFactory.RepositoryError('Role not found for update');
      }

      entityToUpdate.name = role.name;
      await this.roleRepo.save(entityToUpdate);

      await this.rolePermissionRepo.delete({ roleId: role.id });

      const codes = role.permissions.codes;
      if (codes.length > 0) {
        const permissions = await this.permissionRepo.find({
          where: { code: In(codes) },
        });
        await this.rolePermissionRepo.save(
          permissions.map((p) => ({
            roleId: role.id,
            permissionId: p.id,
          })),
        );
      }

      return Result.success(undefined);
    } catch (error) {
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
}
