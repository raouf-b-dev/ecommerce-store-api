import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result, isFailure } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { PasswordHasher } from '../../../../../shared-kernel/domain/interfaces/password-hasher.interface';
import { IdentityGateway } from '../ports/identity.gateway';
import { AuthorizationGateway } from '../ports/authorization.gateway';
import { CredentialRepository } from '../../domain/repositories/credential.repository';
import { Credential } from '../../domain/entities/credential';
import { SystemRoleCode } from '../../../../../shared-kernel/domain/value-objects/system-roles';

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
    private readonly identityGateway: IdentityGateway,
    private readonly authorizationGateway: AuthorizationGateway,
    private readonly credentialRepository: CredentialRepository,
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

    const existingResult = await this.identityGateway.findUserByEmail(
      command.email,
    );
    if (isFailure(existingResult)) {
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

    const passwordHash = await this.passwordHasher.hash(command.password);

    // Step 1: Create user identity (Identity)
    const createUserResult = await this.identityGateway.createUser({
      firstName: 'Super',
      lastName: 'Admin',
      email: command.email,
    });
    if (isFailure(createUserResult)) return createUserResult;

    const user = createUserResult.value;

    // Step 2: Create credential (Authentication)
    const credentialResult = await this.credentialRepository.save(
      Credential.create({
        userId: user.id,
        passwordHash,
        mustChangePassword: true,
      }),
    );
    if (isFailure(credentialResult)) {
      await this.identityGateway.deleteUser(user.id); // compensate step 1
      return ErrorFactory.UseCaseError(
        'Failed to seed super admin credentials',
        credentialResult.error,
      );
    }

    // Step 3: Assign SUPER_ADMIN role (Authorization)
    const roleResult = await this.authorizationGateway.assignRole(
      user.id,
      SystemRoleCode.SUPER_ADMIN,
    );
    if (isFailure(roleResult)) {
      await this.credentialRepository.deleteByUserId(user.id); // compensate step 2
      await this.identityGateway.deleteUser(user.id); // compensate step 1
      return ErrorFactory.UseCaseError(
        'Failed to assign super admin role',
        roleResult.error,
      );
    }

    return Result.success({
      email: command.email,
      status: 'created',
    });
  }
}
