import { InjectRepository } from '@nestjs/typeorm';
import { UserRoleAssignment } from 'src/modules/authorization/core/domain/entities/user-role-assignment';
import { UserRoleAssignmentRepository } from 'src/modules/authorization/core/domain/repositories/user-role-assignment.repository';
import { RepositoryError } from 'src/shared-kernel/domain/exceptions/repository.error';
import { Result } from 'src/shared-kernel/domain/result';
import { Repository } from 'typeorm';
import { UserRoleAssignmentEntity } from '../../orm/user-role-assignment.schema';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';
import { UserRoleAssignmentMapper } from '../../persistence/mappers/user-role-assignment.mapper';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PostgresUserRoleAssignmentRepository
  implements UserRoleAssignmentRepository
{
  constructor(
    @InjectRepository(UserRoleAssignmentEntity)
    private readonly roleRepo: Repository<UserRoleAssignmentEntity>,
  ) {}

  async save(
    assignment: UserRoleAssignment,
  ): Promise<Result<UserRoleAssignment, RepositoryError>> {
    try {
      const entity = this.roleRepo.create(
        UserRoleAssignmentMapper.toEntity(assignment),
      );
      const savedEntity = await this.roleRepo.save(entity);
      return Result.success(UserRoleAssignmentMapper.toDomain(savedEntity));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to save user role assignment',
        error,
      );
    }
  }
  async findByUserId(
    userId: number,
  ): Promise<Result<UserRoleAssignment | null, RepositoryError>> {
    try {
      const entity = await this.roleRepo.findOne({
        where: { userId },
      });
      if (!entity) {
        return Result.success(null);
      }
      return Result.success(UserRoleAssignmentMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find user role assignment',
        error,
      );
    }
  }
  async deleteByUserId(userId: number): Promise<Result<void, RepositoryError>> {
    try {
      await this.roleRepo.delete({ userId });
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to delete user role assignment',
        error,
      );
    }
  }
}
