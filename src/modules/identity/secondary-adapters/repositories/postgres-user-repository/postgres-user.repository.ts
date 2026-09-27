import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { User } from '../../../core/domain/entities/user';
import { UserRepository } from '../../../core/domain/repositories/user.repository';
import { UserMapper } from '../../persistence/mappers/user.mapper';
import { UserEntity } from '../../orm/user.schema';
import { AddressEntity } from '../../orm/address.schema';

@Injectable()
export class PostgresUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
    private readonly dataSource: DataSource,
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

  async findByIdForUpdate(
    id: number,
  ): Promise<
    Result<{ entity: User; expectedVersion: number } | null, RepositoryError>
  > {
    try {
      const entity = await this.repository.findOne({
        where: { id },
        relations: ['addresses'],
      });
      if (!entity) return Result.success(null);
      return Result.success({
        entity: UserMapper.toDomain(entity),
        expectedVersion: entity.version,
      });
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find user for update',
        error,
      );
    }
  }

  async save(
    user: User,
    expectedVersion?: number,
  ): Promise<Result<User, RepositoryError>> {
    try {
      if (expectedVersion !== undefined) {
        return await this.updateWithOptimisticLock(user, expectedVersion);
      }
      return await this.saveNormally(user);
    } catch (error) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError('Failed to save user', error);
    }
  }

  private async saveNormally(
    user: User,
  ): Promise<Result<User, RepositoryError>> {
    const entity = UserMapper.toEntity(user);
    if (!entity.id) {
      entity.id = 0;
    }
    const savedEntity = await this.repository.save(entity);
    user.setId(savedEntity.id);
    return Result.success(user);
  }

  private async updateWithOptimisticLock(
    user: User,
    expectedVersion: number,
  ): Promise<Result<User, RepositoryError>> {
    const mapped = UserMapper.toEntity(user);
    await this.dataSource.transaction(async (manager) => {
      const updateResult = await manager
        .createQueryBuilder()
        .update(UserEntity)
        .set({
          ...UserMapper.toUpdatePayload(user),
          version: () => 'version + 1',
          updatedAt: () => 'CURRENT_TIMESTAMP',
        })
        .where('id = :id AND version = :expectedVersion', {
          id: user.id,
          expectedVersion,
        })
        .execute();

      if (updateResult.affected === 0) {
        throw await this.optimisticLockOrNotFound(
          manager,
          UserEntity,
          'User',
          user.id!,
          expectedVersion,
        );
      }

      await this.syncAddresses(manager, user.id!, mapped.addresses ?? []);
    });

    const updated = await this.repository.findOne({
      where: { id: user.id! },
      relations: ['addresses'],
    });
    if (!updated) {
      return ErrorFactory.RepositoryError('User not found');
    }
    return Result.success(UserMapper.toDomain(updated));
  }

  private async syncAddresses(
    manager: EntityManager,
    userId: number,
    addresses: AddressEntity[],
  ): Promise<void> {
    const existing = await manager.find(AddressEntity, { where: { userId } });
    const incomingIds = new Set(
      addresses
        .filter((address) => address.id > 0)
        .map((address) => address.id),
    );
    const toRemove = existing.filter((address) => !incomingIds.has(address.id));
    if (toRemove.length > 0) {
      await manager.remove(AddressEntity, toRemove);
    }
    if (addresses.length > 0) {
      addresses.forEach((address) => {
        address.userId = userId;
        if (!address.id) {
          delete (address as { id?: number }).id;
        }
      });
      await manager.save(AddressEntity, addresses);
    }
  }

  private async optimisticLockOrNotFound(
    manager: EntityManager,
    entity: typeof UserEntity,
    name: string,
    id: number,
    expectedVersion: number,
  ): Promise<RepositoryError> {
    const existing = await manager.findOne(entity, { where: { id } });
    if (!existing) {
      return new RepositoryError(`${name} not found`);
    }
    return new RepositoryError(
      `Optimistic lock failure for ${name} ${id}. Expected version ${expectedVersion}.`,
      undefined,
      HttpStatus.CONFLICT,
    );
  }

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<Result<User[], RepositoryError>> {
    try {
      const entities = await this.repository.find({
        relations: ['addresses'],
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
        relations: ['addresses'],
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
        relations: ['addresses'],
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
