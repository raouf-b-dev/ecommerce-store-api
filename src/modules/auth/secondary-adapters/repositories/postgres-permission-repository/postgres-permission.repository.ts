import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionRepository } from '../../../core/domain/repositories/permission.repository';
import { PermissionEntity } from '../../orm/permission.schema';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';

import { PermissionMapper } from '../../persistence/mappers/permission.mapper';
import { Permission } from '../../../core/domain/entities/permission';

@Injectable()
export class PostgresPermissionRepository implements PermissionRepository {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly repository: Repository<PermissionEntity>,
  ) {}

  async findByCode(
    code: string,
  ): Promise<Result<Permission | null, RepositoryError>> {
    try {
      const entity = await this.repository.findOne({ where: { code } });
      if (!entity) return Result.success(null);
      return Result.success(PermissionMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find permission by code',
        error,
      );
    }
  }

  async findAll(): Promise<Result<Permission[], RepositoryError>> {
    try {
      const entities = await this.repository.find({ order: { code: 'ASC' } });
      return Result.success(PermissionMapper.toDomainArray(entities));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find all permissions',
        error,
      );
    }
  }

  async saveMany(
    permissions: Permission[],
  ): Promise<Result<Permission[], RepositoryError>> {
    try {
      const entities = PermissionMapper.toEntityArray(permissions);
      const saved = await this.repository.save(entities);
      return Result.success(PermissionMapper.toDomainArray(saved));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to save permissions', error);
    }
  }
}
