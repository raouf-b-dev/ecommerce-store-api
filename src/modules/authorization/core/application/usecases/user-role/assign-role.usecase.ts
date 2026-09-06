import { Injectable, HttpStatus } from '@nestjs/common';
import { UseCaseError } from 'src/shared-kernel/domain/exceptions/usecase.error';
import { UseCase } from 'src/shared-kernel/domain/interfaces/base.usecase';
import { Result } from 'src/shared-kernel/domain/result';
import { UserRoleAssignmentRepository } from '../../../domain/repositories/user-role-assignment.repository';
import { UserRoleAssignment } from '../../../domain/entities/user-role-assignment';
import { RoleRepository } from '../../../domain/repositories/role.repository';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';

export interface AssignRoleCommand {
  userId: number;
  roleCode: string;
}

@Injectable()
export class AssignRoleUseCase implements UseCase<
  AssignRoleCommand,
  void,
  UseCaseError
> {
  constructor(
    private readonly userRoleAssignmentRepository: UserRoleAssignmentRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(
    command: AssignRoleCommand,
  ): Promise<Result<void, UseCaseError>> {
    const [existingUserRoleResult, roleResult] = await Promise.all([
      this.userRoleAssignmentRepository.findByUserId(command.userId),
      this.roleRepository.findByCode(command.roleCode),
    ]);

    if (existingUserRoleResult.isFailure) return existingUserRoleResult;
    if (roleResult.isFailure) return roleResult;

    const existingUserRole = existingUserRoleResult.value;
    const role = roleResult.value;

    if (!role) {
      return ErrorFactory.UseCaseError(
        `Role ${command.roleCode} not found`,
        null,
        HttpStatus.NOT_FOUND,
      );
    }

    let userRole: UserRoleAssignment;

    if (!existingUserRole) {
      userRole = UserRoleAssignment.create({
        userId: command.userId,
        roleId: role.id,
      });
    } else {
      userRole = existingUserRole;
      userRole.updateRole(role.id);
    }

    const saveResult = await this.userRoleAssignmentRepository.save(userRole);
    if (saveResult.isFailure) return saveResult;

    return Result.success(undefined);
  }
}
