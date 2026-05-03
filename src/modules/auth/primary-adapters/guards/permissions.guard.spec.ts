import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsGuard } from './permissions.guard';
import { Reflector } from '@nestjs/core';
import { ResolveRolePermissionsService } from '../../core/application/services/resolve-role-permissions.service';
import { RolePermissionsVO } from '../../core/domain/value-objects/role-permissions';
import { Result } from '../../../../shared-kernel/domain/result';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let mockReflector: jest.Mocked<Reflector>;
  let mockResolvePermissionsService: jest.Mocked<ResolveRolePermissionsService>;

  beforeEach(async () => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    mockResolvePermissionsService = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        { provide: Reflector, useValue: mockReflector },
        {
          provide: ResolveRolePermissionsService,
          useValue: mockResolvePermissionsService,
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
  });

  it('should return true if no permissions required', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user is missing', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['manage_roles']);

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
      }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toThrow(
      'User role not found in request',
    );
  });

  it('should throw ForbiddenException if permission is denied', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['manage_roles']);

    mockResolvePermissionsService.execute.mockResolvedValue(
      Result.success(RolePermissionsVO.fromCodes(['manage_users'])),
    );

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user: { role: 'ADMIN' } }),
      }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Insufficient permissions',
    );
  });

  it('should return true if permission is granted and attach permissions to request', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['manage_roles']);

    mockResolvePermissionsService.execute.mockResolvedValue(
      Result.success(
        RolePermissionsVO.fromCodes(['manage_roles', 'manage_users']),
      ),
    );

    const request = { user: { role: 'ADMIN' } } as any;

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as any;

    expect(await guard.canActivate(context)).toBe(true);
    expect(request.userPermissions.has('manage_roles')).toBe(true);
  });

  it('should throw ForbiddenException if resolving permissions fails', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['manage_roles']);

    mockResolvePermissionsService.execute.mockResolvedValue(
      Result.failure(new Error('Service Error') as any),
    );

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user: { role: 'ADMIN' } }),
      }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Failed to resolve permissions',
    );
  });
});
