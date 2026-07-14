import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { PasswordHasher } from '../../../../../shared-kernel/domain/interfaces/password-hasher.interface';
import { User } from '../../domain/entities/user';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { UserRepository } from '../../domain/repositories/user.repository';
import { SystemRoleCode } from '../../domain/reference-data/system-roles';

export interface SeedSuperAdminCommand {
  email: string;
  password: string;
}

export interface SeedSuperAdminResult {
  email: string;
  status: 'created' | 'existing';
}

@Injectable()
export class SeedSuperAdminUseCase extends UseCase<
  SeedSuperAdminCommand,
  SeedSuperAdminResult,
  UseCaseError
> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {
    super();
  }

  async execute(
    command: SeedSuperAdminCommand,
  ): Promise<Result<SeedSuperAdminResult, UseCaseError>> {
    if (command.password.length < 6) {
      return ErrorFactory.UseCaseError(
        'Password must be at least 6 characters long.',
      );
    }

    const existingResult = await this.userRepository.findByEmail(command.email);
    if (existingResult.isFailure) {
      return ErrorFactory.UseCaseError(
        'Failed to check existing super admin user',
        existingResult.error,
      );
    }

    if (existingResult.value) {
      return Result.success({
        email: command.email,
        status: 'existing',
      });
    }

    const [roleResult, passwordHash] = await Promise.all([
      this.roleRepository.findByCode(SystemRoleCode.SUPER_ADMIN),
      this.passwordHasher.hash(command.password),
    ]);

    if (roleResult.isFailure || !roleResult.value) {
      return ErrorFactory.UseCaseError(
        'SUPER_ADMIN role not found. Please ensure initializers have run.',
        roleResult.isFailure ? roleResult.error : undefined,
      );
    }

    const user = User.create({
      id: null,
      email: command.email,
      passwordHash: passwordHash,
      mustChangePassword: true,
      roleId: roleResult.value.id,
      addresses: [],
      createdAt: new Date(),
      firstName: 'Super',
      isActive: true,
      lastName: 'Admin',
      phone: '',
      updatedAt: new Date(),
    });

    const saveResult = await this.userRepository.save(user);
    if (saveResult.isFailure) {
      return ErrorFactory.UseCaseError(
        'Failed to seed super admin',
        saveResult.error,
      );
    }

    return Result.success({
      email: command.email,
      status: 'created',
    });
  }
}
