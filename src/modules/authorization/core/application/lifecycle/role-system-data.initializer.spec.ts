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
import {
  LoggerTestHelper,
  MockApplicationLifecycle,
} from '../../../../../testing';
import { AuthorizationDtoFactory } from 'src/modules/authorization/testing/factories/authorization.dto.factory';
import { ApplicationLifecyclePort } from '../../../../../shared-kernel/domain/interfaces/application-lifecycle.port';
import { Logger } from '@nestjs/common';
import { PermissionSystemDataInitializer } from './permission-system-data.initializer';

describe('RoleSystemDataInitializer', () => {
  let initializer: RoleSystemDataInitializer;
  let mockRoleRepo: MockRoleRepository;
  let mockPermissionRepo: MockPermissionRepository;
  let lifecycle: MockApplicationLifecycle;
  let role: Role;
  let permissionInitializer: { ensureInitialized: jest.Mock };

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
    lifecycle = new MockApplicationLifecycle();
    permissionInitializer = {
      ensureInitialized: jest.fn().mockResolvedValue(undefined),
    };

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
        {
          provide: ApplicationLifecyclePort,
          useValue: lifecycle,
        },
        {
          provide: PermissionSystemDataInitializer,
          useValue: permissionInitializer,
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

    expect(permissionInitializer.ensureInitialized).toHaveBeenCalled();
    expect(mockRoleRepo.findByCode).toHaveBeenCalled();
    expect(mockRoleRepo.save).toHaveBeenCalled();
    expect(mockRoleRepo.update).not.toHaveBeenCalled();

    const savedRoles = mockRoleRepo.save.mock.calls.map(([saved]) => saved);
    expect(savedRoles.length).toBeGreaterThan(0);
    expect(savedRoles.every((r) => r.isSystem)).toBe(true);
  });

  it('should update system roles if they exist with different permissions', async () => {
    mockRoleRepo.findByCode.mockResolvedValue(Result.success(role));
    mockRoleRepo.update.mockResolvedValue(Result.success<void>(undefined));

    await initializer.onApplicationBootstrap();

    expect(mockRoleRepo.findByCode).toHaveBeenCalled();
    expect(mockRoleRepo.update).toHaveBeenCalled();
    expect(mockRoleRepo.save).not.toHaveBeenCalled();
  });

  it('should correct isSystem when an existing system role was saved as non-system', async () => {
    const { SYSTEM_ROLES } =
      await import('../../domain/reference-data/system-roles');

    mockRoleRepo.findByCode.mockImplementation((code: string) => {
      const def = SYSTEM_ROLES.find((r) => String(r.code) === String(code))!;
      return Promise.resolve(
        Result.success(
          AuthorizationDtoFactory.buildEntity({
            id: 1,
            code: def.code,
            name: def.name,
            isSystem: false,
            permissions: [...def.permissions],
          }),
        ),
      );
    });
    mockRoleRepo.update.mockResolvedValue(Result.success<void>(undefined));

    await initializer.onApplicationBootstrap();

    expect(mockRoleRepo.save).not.toHaveBeenCalled();
    expect(mockRoleRepo.update).toHaveBeenCalled();
    const updatedRoles = mockRoleRepo.update.mock.calls.map(
      ([updated]) => updated,
    );
    expect(updatedRoles.every((r) => r.isSystem)).toBe(true);
  });

  it('should skip update when system role permissions already match', async () => {
    const { SYSTEM_ROLES } =
      await import('../../domain/reference-data/system-roles');
    const matching = AuthorizationDtoFactory.buildEntity({
      id: 1,
      code: SYSTEM_ROLES[0].code,
      name: SYSTEM_ROLES[0].name,
      isSystem: true,
      permissions: [...SYSTEM_ROLES[0].permissions],
    });

    mockRoleRepo.findByCode.mockImplementation((code: string) => {
      const def = SYSTEM_ROLES.find((r) => String(r.code) === String(code))!;
      return Promise.resolve(
        Result.success(
          AuthorizationDtoFactory.buildEntity({
            id: 1,
            code: def.code,
            name: def.name,
            isSystem: true,
            permissions: [...def.permissions],
          }),
        ),
      );
    });

    await initializer.onApplicationBootstrap();

    expect(mockRoleRepo.update).not.toHaveBeenCalled();
    expect(matching.code).toBe(SYSTEM_ROLES[0].code);
  });

  it('links cancel_own_orders onto an existing customer role without touching custom roles', async () => {
    const { SYSTEM_ROLES, SystemRoleCode } =
      await import('../../domain/reference-data/system-roles');
    const customerDef = SYSTEM_ROLES.find(
      (role) => role.code === SystemRoleCode.CUSTOMER,
    );
    if (!customerDef) throw new Error('CUSTOMER system role missing');
    const staleCustomerPermissions = customerDef.permissions.filter(
      (code) => code !== 'cancel_own_orders',
    );
    const customRoleCode = 'STORE_MANAGER';

    mockRoleRepo.findByCode.mockImplementation((code: string) => {
      const def = SYSTEM_ROLES.find((r) => String(r.code) === String(code));
      if (!def) {
        return Promise.resolve(Result.success(null));
      }
      const permissions =
        def.code === SystemRoleCode.CUSTOMER
          ? [...staleCustomerPermissions]
          : [...def.permissions];
      return Promise.resolve(
        Result.success(
          AuthorizationDtoFactory.buildEntity({
            id: 1,
            code: def.code,
            name: def.name,
            isSystem: true,
            permissions,
          }),
        ),
      );
    });
    mockRoleRepo.update.mockResolvedValue(Result.success<void>(undefined));

    await initializer.onApplicationBootstrap();

    expect(mockRoleRepo.update).toHaveBeenCalledTimes(1);
    const updatedCustomer = mockRoleRepo.update.mock.calls[0][0];
    expect(updatedCustomer.code).toBe(SystemRoleCode.CUSTOMER);
    expect(updatedCustomer.permissions.has('cancel_own_orders')).toBe(true);
    expect(updatedCustomer.permissions.has('view_own_orders')).toBe(true);
    expect(mockRoleRepo.findByCode).not.toHaveBeenCalledWith(customRoleCode);

    mockRoleRepo.findByCode.mockImplementation((code: string) => {
      const def = SYSTEM_ROLES.find((r) => String(r.code) === String(code));
      if (!def) throw new Error(`System role missing: ${code}`);
      return Promise.resolve(
        Result.success(
          AuthorizationDtoFactory.buildEntity({
            id: 1,
            code: def.code,
            name: def.name,
            isSystem: true,
            permissions: [...def.permissions],
          }),
        ),
      );
    });
    mockRoleRepo.update.mockClear();

    await initializer.onApplicationBootstrap();

    expect(mockRoleRepo.update).not.toHaveBeenCalled();
    expect(mockRoleRepo.findByCode).not.toHaveBeenCalledWith(customRoleCode);
  });

  it('should skip role and continue if findByCode fails', async () => {
    const { SYSTEM_ROLES } =
      await import('../../domain/reference-data/system-roles');
    mockRoleRepo.findByCode.mockResolvedValueOnce(
      ErrorFactory.RepositoryError('DB error'),
    );
    mockRoleRepo.findByCode.mockResolvedValue(Result.success(null)); // Others succeed but not found
    mockRoleRepo.save.mockResolvedValue(Result.success({} as Role));

    await initializer.onApplicationBootstrap();

    expect(mockRoleRepo.findByCode).toHaveBeenCalled();
    // One failed findByCode; the remaining SYSTEM_ROLES entries are saved.
    expect(mockRoleRepo.save).toHaveBeenCalledTimes(SYSTEM_ROLES.length - 1);
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

  it('should skip init when already shutting down', async () => {
    lifecycle.isShuttingDown = true;

    await initializer.onApplicationBootstrap();

    expect(permissionInitializer.ensureInitialized).not.toHaveBeenCalled();
    expect(mockRoleRepo.findByCode).not.toHaveBeenCalled();
  });

  it('should demote lookup failure to debug when shutting down mid-init', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error');
    const debugSpy = jest.spyOn(Logger.prototype, 'debug');

    mockRoleRepo.findByCode.mockImplementation(() => {
      lifecycle.isShuttingDown = true;
      return Promise.resolve(ErrorFactory.RepositoryError('connection closed'));
    });

    await initializer.onApplicationBootstrap();

    expect(errorSpy).not.toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalledWith(
      expect.stringContaining('ignored during shutdown'),
    );
  });
});
