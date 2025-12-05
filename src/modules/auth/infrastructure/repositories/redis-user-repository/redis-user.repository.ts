import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { Result } from '../../../../../core/domain/result';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { USER_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { User } from '../../../domain/entities/user';
import {
  UserCacheMapper,
  UserForCache,
} from '../../persistence/mappers/user.mapper';

@Injectable()
export class RedisUserRepository implements UserRepository {
  constructor(
    private readonly cacheService: CacheService,
    private readonly postgresRepo: UserRepository,
  ) {}

  private idKey(id: string) {
    return `${USER_REDIS.CACHE_KEY}:${id}`;
  }

  async save(user: User): Promise<Result<User, RepositoryError>> {
    try {
      const dbResult = await this.postgresRepo.save(user);
      if (dbResult.isFailure) return dbResult;

      const saved = dbResult.value;

      await this.cacheService.set(
        this.idKey(saved.id!),
        UserCacheMapper.toCache(saved),
        { ttl: USER_REDIS.EXPIRATION },
      );

      return Result.success(saved);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to save user', error);
    }
  }

  async findByEmail(
    email: string,
  ): Promise<Result<User | null, RepositoryError>> {
    try {
      const cachedUsers = await this.cacheService.getAll<UserForCache>(
        USER_REDIS.INDEX,
        `@email:"${email}"`,
      );

      if (cachedUsers.length > 0) {
        return Result.success(UserCacheMapper.fromCache(cachedUsers[0]));
      }

      const dbResult = await this.postgresRepo.findByEmail(email);
      if (dbResult.isFailure) return dbResult;

      const user = dbResult.value;
      if (user) {
        await this.cacheService.set(
          this.idKey(user.id!),
          UserCacheMapper.toCache(user),
          { ttl: USER_REDIS.EXPIRATION },
        );
      }

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find user by email',
        error,
      );
    }
  }

  async findById(id: string): Promise<Result<User | null, RepositoryError>> {
    try {
      const cached = await this.cacheService.get<UserForCache>(this.idKey(id));
      if (cached) {
        return Result.success(UserCacheMapper.fromCache(cached));
      }

      const dbResult = await this.postgresRepo.findById(id);
      if (dbResult.isFailure) return dbResult;

      const user = dbResult.value;
      if (user) {
        await this.cacheService.set(
          this.idKey(user.id!),
          UserCacheMapper.toCache(user),
          { ttl: USER_REDIS.EXPIRATION },
        );
      }

      return dbResult;
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find user by id', error);
    }
  }

  async delete(id: string): Promise<Result<void, RepositoryError>> {
    try {
      await this.cacheService.delete(this.idKey(id));
      return this.postgresRepo.delete(id);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to delete user', error);
    }
  }
}
