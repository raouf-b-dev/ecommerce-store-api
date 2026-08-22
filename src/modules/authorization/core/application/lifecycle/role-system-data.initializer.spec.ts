import {
  MockPermissionRepository,
  MockRoleRepository,
} from 'src/modules/authorization/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { RoleSystemDataInitializer } from './role-system-data.initializer';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { PermissionRepository } from '../../domain/repositories/permission.repository';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { Role } from '../../domain/entities/role';
import { LoggerTestHelper } from '../../../../../testing';
import { AuthorizationDtoFactory } from 'src/modules/authorization/testing/factories/authorization.dto.factory';

describe('RoleSystemDataInitializer', () => {
  let initializer: RoleSystemDataInitializer;
  let mockRoleRepo: MockRoleRepository;
  let mockPermissionRepo: MockPermissionRepository;
  let role: Role;
  beforeEach(async () => {
    role = AuthorizationDtoFactory.buildEntity({
      id: 1,
      code: 'ADMIN',
      name: 'Admin',
      isSystem: true,
      permissions: [],
    });
    // Silence logs during tests
    LoggerTestHelper.silence();

    mockRoleRepo = new MockRoleRepository();

    mockPermissionRepo = new MockPermissionRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleSystemDataInitializer,
        {
          provide: RoleRepository,
          useValue: mockRoleRepo,
        },
        {
          provide: PermissionRepository,
          useValue: mockPermissionRepo,
        },
      ],
    }).compile();

    initializer = module.get<RoleSystemDataInitializer>(
      RoleSystemDataInitializer,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should create system roles if they do not exist', async () => {
    mockRoleRepo.findByCode.mockResolvedValue(Result.success(null));
    mockRoleRepo.save.mockResolvedValue(Result.success(role));

    await initializer.onApplicationBootstrap();

    expect(mockRoleRepo.findByCode).toHaveBeenCalled();
    expect(mockRoleRepo.save).toHaveBeenCalled();
    expect(mockRoleRepo.update).not.toHaveBeenCalled();
  });

  it('should update system roles if they exist', async () => {
    mockRoleRepo.findByCode.mockResolvedValue(Result.success(role));
    mockRoleRepo.update.mockResolvedValue(Result.success<void>(undefined));

    await initializer.onApplicationBootstrap();

    expect(mockRoleRepo.findByCode).toHaveBeenCalled();
    expect(mockRoleRepo.update).toHaveBeenCalled();
    expect(mockRoleRepo.save).not.toHaveBeenCalled();
  });

  it('should skip role and continue if findByCode fails', async () => {
    mockRoleRepo.findByCode.mockResolvedValueOnce(
      ErrorFactory.RepositoryError('DB error'),
    );
    mockRoleRepo.findByCode.mockResolvedValue(Result.success(null)); // Others succeed but not found
    mockRoleRepo.save.mockResolvedValue(Result.success({} as Role));

    await initializer.onApplicationBootstrap();

    expect(mockRoleRepo.findByCode).toHaveBeenCalled();
    // Assuming SYSTEM_ROLES has 3 roles. One failed findByCode, so save is called 2 times.
    expect(mockRoleRepo.save).toHaveBeenCalledTimes(2);
  });

  it('should handle save failure gracefully', async () => {
    mockRoleRepo.findByCode.mockResolvedValue(Result.success(null));
    mockRoleRepo.save.mockResolvedValue(
      ErrorFactory.RepositoryError('DB error'),
    );

    await initializer.onApplicationBootstrap();

    expect(mockRoleRepo.findByCode).toHaveBeenCalled();
    expect(mockRoleRepo.save).toHaveBeenCalled();
    // No throw
  });

  it('should handle update failure gracefully', async () => {
    mockRoleRepo.findByCode.mockResolvedValue(Result.success(role));
    mockRoleRepo.update.mockResolvedValue(
      ErrorFactory.RepositoryError('DB Error'),
    );

    await initializer.onApplicationBootstrap();

    expect(mockRoleRepo.findByCode).toHaveBeenCalled();
    expect(mockRoleRepo.update).toHaveBeenCalled();
  });
});
