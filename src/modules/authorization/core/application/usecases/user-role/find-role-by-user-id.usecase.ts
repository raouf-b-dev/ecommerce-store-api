import { HttpStatus, Injectable } from '@nestjs/common';
import { UseCaseError } from 'src/shared-kernel/domain/exceptions/usecase.error';
import { Result } from 'src/shared-kernel/domain/result';
import { UserRoleAssignmentRepository } from '../../../domain/repositories/user-role-assignment.repository';
import { UseCase } from 'src/shared-kernel/domain/interfaces/base.usecase';
import { RoleRepository } from '../../../domain/repositories/role.repository';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';

export interface RoleRecord {
  id: number;
  code: string;
  permissions: string[];
}

@Injectable()
export class FindRoleByUserIdUseCase implements UseCase<
  number,
  RoleRecord,
  UseCaseError
> {
  constructor(
    private readonly userRoleAssignmentRepository: UserRoleAssignmentRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(userId: number): Promise<Result<RoleRecord, UseCaseError>> {
    const userRoleAssignmentResult =
      await this.userRoleAssignmentRepository.findByUserId(userId);
    if (userRoleAssignmentResult.isFailure) return userRoleAssignmentResult;

    const userRoleAssignment = userRoleAssignmentResult.value;
    if (!userRoleAssignment) {
      return ErrorFactory.UseCaseError(
        'User role assignment not found',
        null,
        HttpStatus.NOT_FOUND,
      );
    }

    const roleResult = await this.roleRepository.findById(
      userRoleAssignment.roleId,
    );
    if (roleResult.isFailure) return roleResult;

    const role = roleResult.value;
    if (!role) {
      return ErrorFactory.UseCaseError(
        'Role not found',
        null,
        HttpStatus.NOT_FOUND,
      );
    }

    const roleRecord: RoleRecord = {
      id: role.id,
      code: role.code,
      permissions: role.permissions.codes,
    };

    return Result.success(roleRecord);
  }
}
