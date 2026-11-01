import { Injectable } from '@nestjs/common';
import { UseCaseError } from 'src/shared-kernel/domain/exceptions/usecase.error';
import { Result } from 'src/shared-kernel/domain/result';
import { UserRoleAssignmentRepository } from '../../../domain/repositories/user-role-assignment.repository';
import { UseCase } from 'src/shared-kernel/domain/interfaces/base.usecase';
import { RoleRepository } from '../../../domain/repositories/role.repository';
import { ErrorKind } from 'src/shared-kernel/domain/exceptions/error-kind';
import {
  roleNotFoundError,
  userRoleAssignmentNotFoundError,
} from '../../services/role-not-found';

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
      return userRoleAssignmentNotFoundError();
    }

    const roleResult = await this.roleRepository.findById(
      userRoleAssignment.roleId,
    );
    if (roleResult.isFailure) {
      if (roleResult.error.kind === ErrorKind.NOT_FOUND) {
        return roleNotFoundError();
      }
      return roleResult;
    }

    const role = roleResult.value;
    if (!role) {
      return roleNotFoundError();
    }

    const roleRecord: RoleRecord = {
      id: role.id,
      code: role.code,
      permissions: role.permissions.codes,
    };

    return Result.success(roleRecord);
  }
}
