import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsGuard } from './permissions.guard';
import { Reflector } from '@nestjs/core';
import { ResolveRolePermissionsService } from '../../core/application/services/resolve-role-permissions.service';
import { RolePermissionsVO } from '../../core/domain/value-objects/role-permissions';
import { Result } from '../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import {
  createMockExecutionContext,
  createMockRequestWithUser,
} from '../../../../testing';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let mockReflector: jest.Mocked<Reflector>;
  let mockResolvePermissionsService: jest.Mocked<ResolveRolePermissionsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
            get: jest.fn(),
            getAll: jest.fn(),
            getAllAndMerge: jest.fn(),
          },
        },
        {
          provide: ResolveRolePermissionsService,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    mockReflector = module.get(Reflector);
    mockResolvePermissionsService = module.get(ResolveRolePermissionsService);
  });

  it('should return true if no permissions required', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    const context = createMockExecutionContext();

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should return false if user is missing', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['manage_roles']);

    const context = createMockExecutionContext({});

    expect(await guard.canActivate(context)).toBe(false);
  });

  it('should return false if permission is denied', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['manage_roles']);

    mockResolvePermissionsService.execute.mockResolvedValue(
      Result.success(RolePermissionsVO.fromCodes(['manage_users'])),
    );

    const context = createMockExecutionContext(
      createMockRequestWithUser({ role: 'ADMIN' }),
    );

    expect(await guard.canActivate(context)).toBe(false);
  });

  it('should return true if permission is granted and attach permissions to request', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['manage_roles']);

    mockResolvePermissionsService.execute.mockResolvedValue(
      Result.success(
        RolePermissionsVO.fromCodes(['manage_roles', 'manage_users']),
      ),
    );

    const request = createMockRequestWithUser({ role: 'ADMIN' });
    const context = createMockExecutionContext(request);

    expect(await guard.canActivate(context)).toBe(true);
    expect(request.userPermissions?.has('manage_roles')).toBe(true);
  });

  it('should return false if resolving permissions fails', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['manage_roles']);

    mockResolvePermissionsService.execute.mockResolvedValue(
      ErrorFactory.ServiceError('Service Error'),
    );

    const context = createMockExecutionContext(
      createMockRequestWithUser({ role: 'ADMIN' }),
    );

    expect(await guard.canActivate(context)).toBe(false);
  });
});
