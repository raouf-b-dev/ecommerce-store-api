import { Injectable } from '@nestjs/common';
import { UseCaseError } from 'src/shared-kernel/domain/exceptions/usecase.error';
import { UseCase } from 'src/shared-kernel/domain/interfaces/base.usecase';
import { Result } from 'src/shared-kernel/domain/result';
import { UserRoleAssignmentRepository } from '../../../domain/repositories/user-role-assignment.repository';
import { UserRoleAssignment } from '../../../domain/entities/user-role-assignment';
import { DEFAULT_ROLE_CODE } from '../../../domain/reference-data/system-roles';
import { RoleRepository } from '../../../domain/repositories/role.repository';
import { ErrorFactory } from 'src/shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class AssignDefaultRoleUseCase implements UseCase<
  number,
  void,
  UseCaseError
> {
  constructor(
    private readonly userRoleAssignmentRepository: UserRoleAssignmentRepository,
    private readonly roleRepository: RoleRepository,
  ) {}
  async execute(userId: number): Promise<Result<void, UseCaseError>> {
    const [existingUserRoleResult, defaultRoleResult] = await Promise.all([
      this.userRoleAssignmentRepository.findByUserId(userId),
      this.roleRepository.findByCode(DEFAULT_ROLE_CODE),
    ]);

    if (existingUserRoleResult.isFailure) return existingUserRoleResult;

    if (defaultRoleResult.isFailure) return defaultRoleResult;

    const existingUserRole = existingUserRoleResult.value;
    const defaultRole = defaultRoleResult.value;

    if (!defaultRole) {
      return ErrorFactory.UseCaseError('Default role not found');
    }

    let userRole: UserRoleAssignment;

    if (!existingUserRole) {
      userRole = UserRoleAssignment.create({
        userId,
        roleId: defaultRole.id,
      });
    } else {
      userRole = existingUserRole;
      userRole.updateRole(defaultRole.id);
    }

    const result = await this.userRoleAssignmentRepository.save(userRole);
    if (result.isFailure) return result;

    return Result.success(undefined);
  }
}
