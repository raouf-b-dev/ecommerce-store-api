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
import { ensureDemoAccountRoleMatches } from '../../domain/policies/demo-account-reseed.policy';

export interface DemoSeedAccountCreds {
  email: string;
  password: string;
}

export interface SeedDemoAuthUsersInput {
  /**
   * Hosted shared demo: seed viewer + fixture customer only; do not create or
   * update writable local demo operators. Adapters read DEMO_READ_ONLY and
   * pass credentials from env - application never loads env/config.
   */
  readOnly: boolean;
  accounts: {
    superAdmin: DemoSeedAccountCreds;
    admin: DemoSeedAccountCreds;
    viewer: DemoSeedAccountCreds;
    customer: DemoSeedAccountCreds;
  };
}

export interface SeededDemoAuthUser {
  userId: number;
  email: string;
  status: 'created' | 'existing';
}

export interface SeedDemoAuthUsersResult {
  /** Present only when readOnly is false. */
  superAdmin: SeededDemoAuthUser | null;
  /** Present only when readOnly is false. */
  admin: SeededDemoAuthUser | null;
  /** Present only when readOnly is true. */
  viewer: SeededDemoAuthUser | null;
  customer: SeededDemoAuthUser;
}

@Injectable()
export class SeedDemoAuthUsersUseCase extends UseCase<
  SeedDemoAuthUsersInput,
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

  async execute({
    readOnly,
    accounts,
  }: SeedDemoAuthUsersInput): Promise<
    Result<SeedDemoAuthUsersResult, UseCaseError>
  > {
    if (readOnly) {
      const viewer = await this.seedUser({
        email: accounts.viewer.email,
        password: accounts.viewer.password,
        roleCode: SystemRoleCode.ADMIN_READONLY,
        firstName: 'Demo',
        lastName: 'Viewer',
        phone: '',
        mustChangePassword: false,
        verifyExistingRole: true,
      });
      if (isFailure(viewer)) return viewer;

      const customer = await this.seedUser({
        email: accounts.customer.email,
        password: accounts.customer.password,
        roleCode: SystemRoleCode.CUSTOMER,
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '',
        mustChangePassword: false,
        verifyExistingRole: true,
      });
      if (isFailure(customer)) return customer;

      return Result.success({
        superAdmin: null,
        admin: null,
        viewer: viewer.value,
        customer: customer.value,
      });
    }

    const superAdmin = await this.seedUser({
      email: accounts.superAdmin.email,
      password: accounts.superAdmin.password,
      roleCode: SystemRoleCode.SUPER_ADMIN,
      firstName: 'Super',
      lastName: 'Admin',
      phone: '',
      mustChangePassword: true,
      verifyExistingRole: false,
    });
    if (isFailure(superAdmin)) return superAdmin;

    const admin = await this.seedUser({
      email: accounts.admin.email,
      password: accounts.admin.password,
      roleCode: SystemRoleCode.ADMIN,
      firstName: 'Store',
      lastName: 'Administrator',
      phone: '',
      mustChangePassword: true,
      verifyExistingRole: false,
    });
    if (isFailure(admin)) return admin;

    const customer = await this.seedUser({
      email: accounts.customer.email,
      password: accounts.customer.password,
      roleCode: SystemRoleCode.CUSTOMER,
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '',
      mustChangePassword: true,
      verifyExistingRole: false,
    });
    if (isFailure(customer)) return customer;

    return Result.success({
      superAdmin: superAdmin.value,
      admin: admin.value,
      viewer: null,
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
    mustChangePassword: boolean;
    /**
     * Hosted read-only demo publishes these passwords, so an existing account
     * must already hold the seeded role before its credential is reset.
     */
    verifyExistingRole: boolean;
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
      const existingUserId = existingResult.value.id;

      if (input.verifyExistingRole) {
        const roleCheck = await this.ensureExistingRole(
          existingUserId,
          input.email,
          input.roleCode,
        );
        if (isFailure(roleCheck)) return roleCheck;
      }

      const resetResult = await this.resetExistingDemoCredential(
        existingUserId,
        input.email,
        input.password,
        input.mustChangePassword,
      );
      if (isFailure(resetResult)) return resetResult;

      return Result.success({
        userId: existingResult.value.id,
        email: input.email,
        status: 'existing',
      });
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    const createUserResult = await this.identityGateway.createUser({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
    });
    if (isFailure(createUserResult)) return createUserResult;

    const user = createUserResult.value;

    const credentialResult = await this.credentialRepository.save(
      Credential.create({
        userId: user.id,
        passwordHash,
        mustChangePassword: input.mustChangePassword,
      }),
    );
    if (isFailure(credentialResult)) {
      const rollbackResult = await this.rollbackCreatedUser(
        user.id,
        input.email,
        { deleteCredential: false },
      );
      if (isFailure(rollbackResult)) return rollbackResult;
      return ErrorFactory.UseCaseError(
        `Failed to seed credentials for ${input.email}`,
        credentialResult.error,
      );
    }

    const roleResult = await this.authorizationGateway.assignRole(
      user.id,
      input.roleCode,
    );
    if (isFailure(roleResult)) {
      const rollbackResult = await this.rollbackCreatedUser(
        user.id,
        input.email,
        { deleteCredential: true },
      );
      if (isFailure(rollbackResult)) return rollbackResult;
      return ErrorFactory.UseCaseError(
        `Failed to assign role for ${input.email}`,
        roleResult.error,
      );
    }

    return Result.success({
      userId: user.id,
      email: input.email,
      status: 'created',
    });
  }

  private async ensureExistingRole(
    userId: number,
    email: string,
    expectedRoleCode: string,
  ): Promise<Result<void, UseCaseError>> {
    const roleResult = await this.authorizationGateway.findRoleByUserId(userId);
    if (isFailure(roleResult)) {
      return ErrorFactory.UseCaseError(
        `Failed to read role for existing user ${email}`,
        roleResult.error,
      );
    }

    const policyResult = ensureDemoAccountRoleMatches(
      email,
      expectedRoleCode,
      roleResult.value?.code ?? null,
    );
    if (isFailure(policyResult)) {
      return ErrorFactory.UseCaseError(
        policyResult.error.message,
        policyResult.error,
      );
    }
    return Result.success(undefined);
  }

  /**
   * Undoes a partially created demo user. A failed delete is reported, never
   * swallowed: a user left without a credential would otherwise be treated as
   * "existing" by the next seed run.
   */
  private async rollbackCreatedUser(
    userId: number,
    email: string,
    options: { deleteCredential: boolean },
  ): Promise<Result<void, UseCaseError>> {
    if (options.deleteCredential) {
      const credentialDelete =
        await this.credentialRepository.deleteByUserId(userId);
      if (isFailure(credentialDelete)) {
        return ErrorFactory.UseCaseError(
          `Failed to roll back credentials for ${email}`,
          credentialDelete.error,
        );
      }
    }

    const userDelete = await this.identityGateway.deleteUser(userId);
    if (isFailure(userDelete)) {
      return ErrorFactory.UseCaseError(
        `Failed to roll back user ${email}`,
        userDelete.error,
      );
    }
    return Result.success(undefined);
  }

  /**
   * Re-applies demo credential defaults so local re-seed restores documented
   * passwords (and forced-rotation when mustChangePassword is true).
   */
  private async resetExistingDemoCredential(
    userId: number,
    email: string,
    plainPassword: string,
    mustChangePassword: boolean,
  ): Promise<Result<void, UseCaseError>> {
    const credentialResult =
      await this.credentialRepository.findByUserId(userId);
    if (isFailure(credentialResult)) {
      return ErrorFactory.UseCaseError(
        `Failed to read credentials for existing user ${email}`,
        credentialResult.error,
      );
    }
    if (!credentialResult.value) {
      return ErrorFactory.UseCaseError(
        `Existing user ${email} has no credentials; remove the account or restore its credentials before re-seeding`,
      );
    }

    const passwordHash = await this.passwordHasher.hash(plainPassword);
    const credential = credentialResult.value;
    credential.passwordHash = passwordHash;
    credential.mustChangePassword = mustChangePassword;

    const updateResult = await this.credentialRepository.update(credential);
    if (isFailure(updateResult)) {
      return ErrorFactory.UseCaseError(
        `Failed to reset credentials for ${email}`,
        updateResult.error,
      );
    }
    return Result.success(undefined);
  }
}
