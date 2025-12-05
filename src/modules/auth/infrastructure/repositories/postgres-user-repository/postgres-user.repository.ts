import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { User } from '../../../domain/entities/user';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { UserEntity } from '../../orm/user.schema';
import { UserMapper } from '../../persistence/mappers/user.mapper';
import { IdGeneratorService } from '../../../../../core/infrastructure/orm/id-generator.service';

@Injectable()
export class PostgresUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
    private readonly idGenerator: IdGeneratorService,
  ) {}

  async save(user: User): Promise<Result<User, RepositoryError>> {
    try {
      const primitives = user.toPrimitives();
      if (!primitives.id) {
        primitives.id = await this.idGenerator.generateUserId();
      }

      const entity = UserMapper.toEntity(User.fromPrimitives(primitives));
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

  async findById(id: string): Promise<Result<User | null, RepositoryError>> {
    try {
      const entity = await this.repository.findOne({ where: { id } });
      if (!entity) return Result.success(null);
      return Result.success(UserMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find user by id', error);
    }
  }

  async delete(id: string): Promise<Result<void, RepositoryError>> {
    try {
      await this.repository.delete(id);
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to delete user', error);
    }
  }
}
