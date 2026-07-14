import { Injectable, Logger } from '@nestjs/common';
import { UserRepository } from '../../../core/domain/repositories/user.repository';
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { CachePort } from '../../../../../infrastructure/redis/cache/cache.port';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { USER_REDIS } from '../../../../../infrastructure/redis/constants/redis.constants';
import { escapeRedisSearchTextValue } from '../../../../../infrastructure/redis/search/search-utils';
import { User } from '../../../core/domain/entities/user';
import {
  UserCacheMapper,
  UserForCache,
} from '../../persistence/mappers/user.mapper';

@Injectable()
export class CachedUserRepository implements UserRepository {
  private readonly logger = new Logger(CachedUserRepository.name);

  constructor(
    private readonly cacheService: CachePort,
    private readonly postgresRepo: UserRepository,
  ) {}

  private idKey(id: number) {
    return `${USER_REDIS.CACHE_KEY}:${id}`;
  }

  async save(user: User): Promise<Result<User, RepositoryError>> {
    try {
      const dbResult = await this.postgresRepo.save(user);
      if (dbResult.isFailure) return dbResult;

      const saved = dbResult.value;

      try {
        await this.cacheService.set(
          this.idKey(saved.id!),
          UserCacheMapper.toCache(saved),
          { ttl: USER_REDIS.EXPIRATION },
        );
      } catch (cacheError) {
        this.logger.warn(
          `Failed to cache user ${saved.id} after save`,
          cacheError,
        );
      }

      return Result.success(saved);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to save user', error);
    }
  }

  async update(user: User): Promise<Result<void, RepositoryError>> {
    try {
      const dbResult = await this.postgresRepo.update(user);
      if (dbResult.isFailure) return dbResult;

      try {
        await this.cacheService.set(
          this.idKey(user.id!),
          UserCacheMapper.toCache(user),
          { ttl: USER_REDIS.EXPIRATION },
        );
      } catch (cacheError) {
        this.logger.warn(
          `Failed to cache user ${user.id} after save`,
          cacheError,
        );
      }

      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to save user', error);
    }
  }
  async existsByEmail(
    email: string,
  ): Promise<Result<boolean, RepositoryError>> {
    try {
      const dbResult = await this.postgresRepo.existsByEmail(email);
      if (dbResult.isFailure) return dbResult;

      return Result.success(dbResult.value);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to check if user exists by email',
        error,
      );
    }
  }

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<Result<User[], RepositoryError>> {
    try {
      const cachedUsers = await this.cacheService.getAll<UserForCache>(
        USER_REDIS.INDEX,
      );

      if (cachedUsers.length > 0) {
        return Result.success(
          cachedUsers.map((c) => UserCacheMapper.fromCache(c)),
        );
      }

      const dbResult = await this.postgresRepo.findAll(page, limit);
      if (dbResult.isFailure) return dbResult;

      const users = dbResult.value;
      if (users.length > 0) {
        try {
          const entries = users.flatMap((user) => {
            const items = [
              {
                key: this.idKey(user.id!),
                value: UserCacheMapper.toCache(user),
              },
            ];
            return items;
          });

          await this.cacheService.setAll(entries, {
            ttl: USER_REDIS.EXPIRATION,
          });
        } catch (cacheError) {
          this.logger.warn(`Failed to cache users after DB lookup`, cacheError);
        }
      }

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find all users', error);
    }
  }

  async findByEmail(
    email: string,
  ): Promise<Result<User | null, RepositoryError>> {
    try {
      const cachedUsers = await this.cacheService.getAll<UserForCache>(
        USER_REDIS.INDEX,
        `@email:{${escapeRedisSearchTextValue(email)}}`,
      );

      if (cachedUsers.length > 0) {
        return Result.success(UserCacheMapper.fromCache(cachedUsers[0]));
      }
    } catch (error) {
      this.logger.warn(`Cache lookup failed for email: ${email}`, error);
    }

    try {
      const dbResult = await this.postgresRepo.findByEmail(email);
      if (dbResult.isFailure) return dbResult;

      const user = dbResult.value;
      if (user) {
        try {
          await this.cacheService.set(
            this.idKey(user.id!),
            UserCacheMapper.toCache(user),
            { ttl: USER_REDIS.EXPIRATION },
          );
        } catch (cacheError) {
          this.logger.warn(
            `Failed to cache user ${user.id} after DB lookup`,
            cacheError,
          );
        }
      }

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find user by email',
        error,
      );
    }
  }

  async findById(id: number): Promise<Result<User | null, RepositoryError>> {
    try {
      const cached = await this.cacheService.get<UserForCache>(this.idKey(id));
      if (cached) {
        return Result.success(UserCacheMapper.fromCache(cached));
      }
    } catch (error) {
      this.logger.warn(`Cache lookup failed for ID: ${id}`, error);
    }

    try {
      const dbResult = await this.postgresRepo.findById(id);
      if (dbResult.isFailure) return dbResult;

      const user = dbResult.value;
      if (user) {
        try {
          await this.cacheService.set(
            this.idKey(user.id!),
            UserCacheMapper.toCache(user),
            { ttl: USER_REDIS.EXPIRATION },
          );
        } catch (cacheError) {
          this.logger.warn(
            `Failed to cache user ${user.id} after DB lookup`,
            cacheError,
          );
        }
      }

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find user by id', error);
    }
  }

  async delete(id: number): Promise<Result<void, RepositoryError>> {
    try {
      try {
        await this.cacheService.delete(this.idKey(id));
      } catch (cacheError) {
        this.logger.warn(`Failed to delete user ${id} from cache`, cacheError);
      }
      return this.postgresRepo.delete(id);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to delete user', error);
    }
  }
}
