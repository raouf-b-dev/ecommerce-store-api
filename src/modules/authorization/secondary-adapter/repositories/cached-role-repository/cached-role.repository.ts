import { Injectable, Logger } from '@nestjs/common';
import { RoleRepository } from '../../../core/domain/repositories/role.repository';
import { Role } from '../../../core/domain/entities/role';
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { CachePort } from '../../../../../shared-kernel/domain/interfaces/cache.port';
import {
  AUTHORIZATION_REDIS,
  rolePermissionsCacheKey,
} from '../../../../../infrastructure/redis/constants/redis.constants';

@Injectable()
export class CachedRoleRepository implements RoleRepository {
  constructor(
    private readonly cacheService: CachePort,
    private readonly postgresRepo: RoleRepository,
    private readonly logger: Logger,
  ) {}

  findById(id: number): Promise<Result<Role, RepositoryError>> {
    return this.postgresRepo.findById(id);
  }

  findByCode(code: string): Promise<Result<Role | null, RepositoryError>> {
    return this.postgresRepo.findByCode(code);
  }

  findAll(): Promise<Result<Role[], RepositoryError>> {
    return this.postgresRepo.findAll();
  }

  async save(role: Role): Promise<Result<Role, RepositoryError>> {
    const result = await this.postgresRepo.save(role);
    if (result.isSuccess) {
      await this.invalidatePermissionCache(role.code);
    }
    return result;
  }

  async saveMany(roles: Role[]): Promise<Result<Role[], RepositoryError>> {
    const result = await this.postgresRepo.saveMany(roles);
    if (result.isSuccess) {
      await Promise.all(
        roles.map((role) => this.invalidatePermissionCache(role.code)),
      );
    }
    return result;
  }

  async update(role: Role): Promise<Result<void, RepositoryError>> {
    const result = await this.postgresRepo.update(role);
    if (result.isSuccess) {
      await this.invalidatePermissionCache(role.code);
    }
    return result;
  }

  async delete(id: number): Promise<Result<void, RepositoryError>> {
    const roleResult = await this.postgresRepo.findById(id);
    if (roleResult.isFailure) {
      return Result.failure(roleResult.error);
    }

    const deleteResult = await this.postgresRepo.delete(id);
    if (deleteResult.isSuccess) {
      await this.invalidatePermissionCache(roleResult.value.code);
    }
    return deleteResult;
  }

  async findPermissionCodesByRoleCode(
    roleCode: string,
  ): Promise<Result<string[] | null, RepositoryError>> {
    if (this.cacheService.isAvailable()) {
      try {
        const cached = await this.cacheService.get<string[]>(
          rolePermissionsCacheKey(roleCode),
        );
        if (cached !== null && cached !== undefined) {
          return Result.success(cached);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to read role permissions cache for ${roleCode}`,
          error,
        );
      }
    }

    const result =
      await this.postgresRepo.findPermissionCodesByRoleCode(roleCode);
    if (result.isFailure) {
      return result;
    }

    const codes = result.value ?? [];
    if (this.cacheService.isAvailable()) {
      try {
        await this.cacheService.set(rolePermissionsCacheKey(roleCode), codes, {
          ttl: AUTHORIZATION_REDIS.EXPIRATION,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to write role permissions cache for ${roleCode}`,
          error,
        );
      }
    }

    return result.value === null ? Result.success(null) : Result.success(codes);
  }

  private async invalidatePermissionCache(roleCode: string): Promise<void> {
    if (!this.cacheService.isAvailable()) {
      return;
    }

    try {
      await this.cacheService.delete(rolePermissionsCacheKey(roleCode));
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate role permissions cache for ${roleCode}`,
        error,
      );
    }
  }
}
