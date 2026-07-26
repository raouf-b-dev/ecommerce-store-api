import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { User } from '../../../core/domain/entities/user';
import { UserRepository } from '../../../core/domain/repositories/user.repository';
import { UserMapper } from '../../persistence/mappers/user.mapper';
import { UserEntity } from '../../orm/user.schema';

@Injectable()
export class PostgresUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async existsByEmail(
    email: string,
  ): Promise<Result<boolean, RepositoryError>> {
    try {
      const exists = await this.repository.exists({ where: { email } });
      return Result.success(exists);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to check if user exists by email',
        error,
      );
    }
  }

  async save(user: User): Promise<Result<User, RepositoryError>> {
    try {
      const entity = UserMapper.toEntity(user);
      // For new users (id = 0 or null), TypeORM will generate the ID
      if (!entity.id) {
        entity.id = 0; // Will be replaced by auto-increment
      }
      const savedEntity = await this.repository.save(entity);
      return Result.success(UserMapper.toDomain(savedEntity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to save user', error);
    }
  }

  async update(user: User): Promise<Result<void, RepositoryError>> {
    try {
      const entity = UserMapper.toEntity(user);
      await this.repository.update(entity.id, entity);
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to update user', error);
    }
  }

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<Result<User[], RepositoryError>> {
    try {
      const entities = await this.repository.find({
        relations: ['roleEntity'],
        take: limit,
        skip: (page - 1) * limit,
      });
      return Result.success(entities.map(UserMapper.toDomain));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find all users', error);
    }
  }

  async findByEmail(
    email: string,
  ): Promise<Result<User | null, RepositoryError>> {
    try {
      const entity = await this.repository.findOne({
        where: { email },
        relations: ['roleEntity'],
      });
      if (!entity) return Result.success(null);
      return Result.success(UserMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find user by email',
        error,
      );
    }
  }

  async findById(id: number): Promise<Result<User | null, RepositoryError>> {
    try {
      const entity = await this.repository.findOne({
        where: { id },
        relations: ['roleEntity'],
      });
      if (!entity) return Result.success(null);
      return Result.success(UserMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find user by id', error);
    }
  }

  async delete(id: number): Promise<Result<void, RepositoryError>> {
    try {
      await this.repository.delete(id);
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to delete user', error);
    }
  }
}
