import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { PasswordHasher } from '../../../../../shared-kernel/domain/interfaces/password-hasher.interface';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user';
import { SystemRoleCode } from '../../domain/reference-data/system-roles';

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
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {
    super();
  }

  async execute(): Promise<Result<SeedDemoAuthUsersResult, UseCaseError>> {
    const [adminRoleResult, customerRoleResult] = await Promise.all([
      this.roleRepository.findByCode(SystemRoleCode.ADMIN),
      this.roleRepository.findByCode(SystemRoleCode.CUSTOMER),
    ]);

    if (adminRoleResult.isFailure || !adminRoleResult.value) {
      return ErrorFactory.UseCaseError(
        'ADMIN role not found. Ensure system role initializers have run.',
        adminRoleResult.isFailure ? adminRoleResult.error : undefined,
      );
    }

    if (customerRoleResult.isFailure || !customerRoleResult.value) {
      return ErrorFactory.UseCaseError(
        'CUSTOMER role not found. Ensure system role initializers have run.',
        customerRoleResult.isFailure ? customerRoleResult.error : undefined,
      );
    }

    const admin = await this.seedUser({
      email: 'admin@store.local',
      password: 'Admin123!',
      roleId: adminRoleResult.value.id,
      firstName: 'Super',
      lastName: 'Admin',
      phone: '',
    });
    if (admin.isFailure) return admin;

    const customer = await this.seedUser({
      email: 'customer@store.local',
      password: 'Customer123!',
      roleId: customerRoleResult.value.id,
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '',
    });
    if (customer.isFailure) return customer;

    return Result.success({
      admin: admin.value,
      customer: customer.value,
    });
  }

  private async seedUser(input: {
    email: string;
    password: string;
    roleId: number;
    firstName: string;
    lastName: string;
    phone: string;
  }): Promise<Result<SeededDemoAuthUser, UseCaseError>> {
    const existingResult = await this.userRepository.findByEmail(input.email);
    if (existingResult.isFailure) {
      return ErrorFactory.UseCaseError(
        `Failed to check existing user ${input.email}`,
        existingResult.error,
      );
    }

    if (existingResult.value) {
      return Result.success({ email: input.email, status: 'existing' });
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = User.create({
      id: null,
      email: input.email,
      passwordHash: passwordHash,
      mustChangePassword: true,
      roleId: input.roleId,
      addresses: [],
      createdAt: new Date(),
      firstName: input.firstName ?? '',
      isActive: true,
      lastName: input.lastName ?? '',
      phone: input.phone ?? '',
      updatedAt: new Date(),
    });

    const saveResult = await this.userRepository.save(user);
    if (saveResult.isFailure) {
      return ErrorFactory.UseCaseError(
        `Failed to seed user ${input.email}`,
        saveResult.error,
      );
    }

    return Result.success({ email: input.email, status: 'created' });
  }
}
