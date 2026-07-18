import { Test, TestingModule } from '@nestjs/testing';
import { SeedSuperAdminUseCase } from './seed-super-admin.usecase';
import { UserRepository } from '../../domain/repositories/user.repository';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { PasswordHasher } from '../../../../../shared-kernel/domain/interfaces/password-hasher.interface';
import { MockUserRepository } from '../../../testing/mocks/user-repository.mock';
import { MockRoleRepository } from '../../../testing/mocks/role-repository.mock';
import { MockPasswordHasher } from '../../../../authentication/testing/mocks/password-hasher.mock';
import { Result } from '../../../../../shared-kernel/domain/result';
import { Role } from '../../domain/entities/role';
import { SystemRoleCode } from '../../domain/reference-data/system-roles';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';

describe('SeedSuperAdminUseCase', () => {
  let useCase: SeedSuperAdminUseCase;
  let userRepository: MockUserRepository;
  let roleRepository: MockRoleRepository;
  let passwordHasher: MockPasswordHasher;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedSuperAdminUseCase,
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

    useCase = module.get<SeedSuperAdminUseCase>(SeedSuperAdminUseCase);
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

  it('should seed super admin user when they do not exist', async () => {
    userRepository.findByEmail.mockResolvedValue(Result.success(null));
    const mockRole = Role.fromPrimitives({
      id: 1,
      name: 'Super Admin',
      code: SystemRoleCode.SUPER_ADMIN,
      isSystem: true,
      permissions: { codes: [] },
    });
    roleRepository.findByCode.mockResolvedValue(Result.success(mockRole));
    passwordHasher.hash.mockResolvedValue('hashed_password');
    userRepository.save.mockResolvedValue(Result.success({} as any));

    const result = await useCase.execute({
      email: 'superadmin@example.com',
      password: 'strongpassword123',
    });

    expect(result.isSuccess).toBe(true);
    expect((result as any).value).toEqual({
      email: 'superadmin@example.com',
      status: 'created',
    });
    expect(userRepository.findByEmail).toHaveBeenCalledWith(
      'superadmin@example.com',
    );
    expect(roleRepository.findByCode).toHaveBeenCalledWith(
      SystemRoleCode.SUPER_ADMIN,
    );
    expect(passwordHasher.hash).toHaveBeenCalledWith('strongpassword123');
    expect(userRepository.save).toHaveBeenCalled();
  });

  it('should skip seeding if super admin already exists', async () => {
    userRepository.findByEmail.mockResolvedValue(Result.success({} as any));

    const result = await useCase.execute({
      email: 'superadmin@example.com',
      password: 'strongpassword123',
    });

    expect(result.isSuccess).toBe(true);
    expect((result as any).value).toEqual({
      email: 'superadmin@example.com',
      status: 'existing',
    });
    expect(userRepository.findByEmail).toHaveBeenCalledWith(
      'superadmin@example.com',
    );
    expect(roleRepository.findByCode).not.toHaveBeenCalled();
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('should reject short passwords', async () => {
    const result = await useCase.execute({
      email: 'superadmin@example.com',
      password: '123',
    });

    expect(result.isFailure).toBe(true);
    expect((result as any).error?.message).toBe(
      'Password must be at least 6 characters long.',
    );
  });

  it('should return error if role SUPER_ADMIN is missing', async () => {
    userRepository.findByEmail.mockResolvedValue(Result.success(null));
    roleRepository.findByCode.mockResolvedValue(Result.success(null));

    const result = await useCase.execute({
      email: 'superadmin@example.com',
      password: 'strongpassword123',
    });

    expect(result.isFailure).toBe(true);
    expect((result as any).error?.message).toContain(
      'SUPER_ADMIN role not found',
    );
  });

  it('should propagate repository errors from findByEmail', async () => {
    userRepository.findByEmail.mockResolvedValue(
      Result.failure(new RepositoryError('DB error')),
    );

    const result = await useCase.execute({
      email: 'superadmin@example.com',
      password: 'strongpassword123',
    });

    expect(result.isFailure).toBe(true);
    expect((result as any).error?.message).toContain(
      'Failed to check existing super admin user',
    );
  });
});
