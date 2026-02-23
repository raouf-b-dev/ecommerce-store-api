import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/errors/error.factory';
import { RepositoryError } from '../../../../../shared-kernel/errors/repository.error';
import { User } from '../../../core/domain/entities/user';
import { UserRepository } from '../../../core/domain/repositories/user.repository';
import { UserEntity } from '../../orm/user.schema';
import { UserMapper } from '../../persistence/mappers/user.mapper';

@Injectable()
export class PostgresUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async save(user: User): Promise<Result<User, RepositoryError>> {
    try {
      const entity = UserMapper.toEntity(user);
      // For new users (id = 0 or null), TypeORM will generate the ID
      if (!entity.id) {
        entity.id = 0 as any; // Will be replaced by auto-increment
      }
      const savedEntity = await this.repository.save(entity);
      return Result.success(UserMapper.toDomain(savedEntity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to save user', error);
    }
  }

  async findByEmail(
    email: string,
  ): Promise<Result<User | null, RepositoryError>> {
    try {
      const entity = await this.repository.findOne({ where: { email } });
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
      const entity = await this.repository.findOne({ where: { id } });
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
