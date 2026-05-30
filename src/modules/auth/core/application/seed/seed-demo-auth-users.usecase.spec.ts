import { Test, TestingModule } from '@nestjs/testing';
import { SeedDemoAuthUsersUseCase } from './seed-demo-auth-users.usecase';
import { UserRepository } from '../../domain/repositories/user.repository';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { PasswordHasher } from '../../../../../shared-kernel/domain/interfaces/password-hasher.interface';
import { MockUserRepository } from '../../../testing/mocks/user-repository.mock';
import { MockRoleRepository } from '../../../testing/mocks/role-repository.mock';
import { MockPasswordHasher } from '../../../testing/mocks/password-hasher.mock';
import { Result } from '../../../../../shared-kernel/domain/result';
import { Role } from '../../domain/entities/role';
import { SystemRoleCode } from '../../domain/reference-data/system-roles';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';

describe('SeedDemoAuthUsersUseCase', () => {
  let useCase: SeedDemoAuthUsersUseCase;
  let userRepository: MockUserRepository;
  let roleRepository: MockRoleRepository;
  let passwordHasher: MockPasswordHasher;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedDemoAuthUsersUseCase,
        {
          provide: UserRepository,
          useClass: MockUserRepository,
        },
        {
          provide: RoleRepository,
          useClass: MockRoleRepository,
        },
        {
          provide: PasswordHasher,
          useClass: MockPasswordHasher,
        },
      ],
    }).compile();

    useCase = module.get<SeedDemoAuthUsersUseCase>(SeedDemoAuthUsersUseCase);
    userRepository = module.get<UserRepository>(
      UserRepository,
    ) as unknown as MockUserRepository;
    roleRepository = module.get<RoleRepository>(
      RoleRepository,
    ) as unknown as MockRoleRepository;
    passwordHasher = module.get<PasswordHasher>(
      PasswordHasher,
    ) as unknown as MockPasswordHasher;
  });

  it('should seed missing admin and customer users', async () => {
    const adminRole = Role.fromPrimitives({
      id: 1,
      name: 'Admin',
      code: SystemRoleCode.ADMIN,
      isSystem: true,
      permissions: { codes: [] },
    });
    const customerRole = Role.fromPrimitives({
      id: 2,
      name: 'Customer',
      code: SystemRoleCode.CUSTOMER,
      isSystem: true,
      permissions: { codes: [] },
    });

    roleRepository.findByCode
      .mockResolvedValueOnce(Result.success(adminRole))
      .mockResolvedValueOnce(Result.success(customerRole));

    userRepository.findByEmail.mockResolvedValue(Result.success(null));
    passwordHasher.hash.mockResolvedValue('hashed_password');
    userRepository.save.mockResolvedValue(Result.success({} as any));

    const result = await useCase.execute({ customerId: 99 });

    expect(result.isSuccess).toBe(true);
    expect((result as any).value).toEqual({
      admin: { email: 'admin@store.local', status: 'created' },
      customer: { email: 'customer@store.local', status: 'created' },
    });
    expect(userRepository.findByEmail).toHaveBeenCalledWith(
      'admin@store.local',
    );
    expect(userRepository.findByEmail).toHaveBeenCalledWith(
      'customer@store.local',
    );
    expect(userRepository.save).toHaveBeenCalledTimes(2);
  });

  it('should skip creation if users already exist', async () => {
    const adminRole = Role.fromPrimitives({
      id: 1,
      name: 'Admin',
      code: SystemRoleCode.ADMIN,
      isSystem: true,
      permissions: { codes: [] },
    });
    const customerRole = Role.fromPrimitives({
      id: 2,
      name: 'Customer',
      code: SystemRoleCode.CUSTOMER,
      isSystem: true,
      permissions: { codes: [] },
    });

    roleRepository.findByCode
      .mockResolvedValueOnce(Result.success(adminRole))
      .mockResolvedValueOnce(Result.success(customerRole));

    userRepository.findByEmail.mockResolvedValue(Result.success({} as any));

    const result = await useCase.execute({ customerId: 99 });

    expect(result.isSuccess).toBe(true);
    expect((result as any).value).toEqual({
      admin: { email: 'admin@store.local', status: 'existing' },
      customer: { email: 'customer@store.local', status: 'existing' },
    });
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('should return error if ADMIN role is missing', async () => {
    roleRepository.findByCode.mockResolvedValue(Result.success(null));

    const result = await useCase.execute({ customerId: 99 });

    expect(result.isFailure).toBe(true);
    expect((result as any).error?.message).toContain('ADMIN role not found');
  });

  it('should return error if CUSTOMER role is missing', async () => {
    const adminRole = Role.fromPrimitives({
      id: 1,
      name: 'Admin',
      code: SystemRoleCode.ADMIN,
      isSystem: true,
      permissions: { codes: [] },
    });
    roleRepository.findByCode
      .mockResolvedValueOnce(Result.success(adminRole))
      .mockResolvedValueOnce(Result.success(null));

    const result = await useCase.execute({ customerId: 99 });

    expect(result.isFailure).toBe(true);
    expect((result as any).error?.message).toContain('CUSTOMER role not found');
  });

  it('should propagate repository errors from findByEmail', async () => {
    const adminRole = Role.fromPrimitives({
      id: 1,
      name: 'Admin',
      code: SystemRoleCode.ADMIN,
      isSystem: true,
      permissions: { codes: [] },
    });
    const customerRole = Role.fromPrimitives({
      id: 2,
      name: 'Customer',
      code: SystemRoleCode.CUSTOMER,
      isSystem: true,
      permissions: { codes: [] },
    });

    roleRepository.findByCode
      .mockResolvedValueOnce(Result.success(adminRole))
      .mockResolvedValueOnce(Result.success(customerRole));

    userRepository.findByEmail.mockResolvedValue(
      Result.failure(new RepositoryError('Database failure')),
    );

    const result = await useCase.execute({ customerId: 99 });

    expect(result.isFailure).toBe(true);
    expect((result as any).error?.message).toContain(
      'Failed to check existing user admin@store.local',
    );
  });
});
