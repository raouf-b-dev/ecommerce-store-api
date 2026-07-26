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
import { SystemRoleCode } from '../../../../authorization/core/domain/reference-data/system-roles';

export interface SeededDemoAuthUser {
  email: string;
  status: 'created' | 'existing';
}

export interface SeedDemoAuthUsersResult {
  admin: SeededDemoAuthUser;
  customer: SeededDemoAuthUser;
}

@Injectable()
export class SeedDemoAuthUsersUseCase extends UseCase<
  void,
  SeedDemoAuthUsersResult,
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

  async execute(): Promise<Result<SeedDemoAuthUsersResult, UseCaseError>> {
    const admin = await this.seedUser({
      email: 'admin@store.local',
      password: 'Admin123!',
      roleCode: SystemRoleCode.ADMIN,
      firstName: 'Super',
      lastName: 'Admin',
      phone: '',
    });
    if (isFailure(admin)) return admin;

    const customer = await this.seedUser({
      email: 'customer@store.local',
      password: 'Customer123!',
      roleCode: SystemRoleCode.CUSTOMER,
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '',
    });
    if (isFailure(customer)) return customer;

    return Result.success({
      admin: admin.value,
      customer: customer.value,
    });
  }

  private async seedUser(input: {
    email: string;
    password: string;
    roleCode: string;
    firstName: string;
    lastName: string;
    phone: string;
  }): Promise<Result<SeededDemoAuthUser, UseCaseError>> {
    const existingResult = await this.identityGateway.findUserByEmail(
      input.email,
    );
    if (isFailure(existingResult)) {
      return ErrorFactory.UseCaseError(
        `Failed to check existing user ${input.email}`,
        existingResult.error,
      );
    }

    if (existingResult.value) {
      return Result.success({ email: input.email, status: 'existing' });
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    // Step 1: Create user identity (Identity)
    const createUserResult = await this.identityGateway.createUser({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
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
        `Failed to seed credentials for ${input.email}`,
        credentialResult.error,
      );
    }

    // Step 3: Assign role (Authorization)
    const roleResult = await this.authorizationGateway.assignRole(
      user.id,
      input.roleCode,
    );
    if (isFailure(roleResult)) {
      await this.credentialRepository.deleteByUserId(user.id); // compensate step 2
      await this.identityGateway.deleteUser(user.id); // compensate step 1
      return ErrorFactory.UseCaseError(
        `Failed to assign role for ${input.email}`,
        roleResult.error,
      );
    }

    return Result.success({ email: input.email, status: 'created' });
  }
}
