import { MockPermissionRepository } from 'src/modules/authorization/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionSystemDataInitializer } from './permission-system-data.initializer';
import { PermissionRepository } from '../../domain/repositories/permission.repository';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { Permission } from '../../domain/entities/permission';
import { SYSTEM_PERMISSIONS } from '../../domain/reference-data/permission-definitions';
import {
  LoggerTestHelper,
  MockApplicationLifecycle,
} from '../../../../../testing';
import { ApplicationLifecyclePort } from '../../../../../shared-kernel/domain/interfaces/application-lifecycle.port';
import { Logger } from '@nestjs/common';

describe('PermissionSystemDataInitializer', () => {
  let initializer: PermissionSystemDataInitializer;
  let mockPermissionRepo: MockPermissionRepository;
  let lifecycle: MockApplicationLifecycle;

  beforeEach(async () => {
    // Silence logs during tests
    LoggerTestHelper.silence();

    mockPermissionRepo = new MockPermissionRepository();
    lifecycle = new MockApplicationLifecycle();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionSystemDataInitializer,
        {
          provide: PermissionRepository,
          useValue: mockPermissionRepo,
        },
        {
          provide: ApplicationLifecyclePort,
          useValue: lifecycle,
        },
      ],
    }).compile();

    initializer = module.get(PermissionSystemDataInitializer);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('inserts missing permission codes when none exist', async () => {
    mockPermissionRepo.findAll.mockResolvedValue(Result.success([]));
    mockPermissionRepo.saveMany.mockResolvedValue(Result.success([]));

    await initializer.onApplicationBootstrap();

    expect(mockPermissionRepo.findAll).toHaveBeenCalled();
    expect(mockPermissionRepo.saveMany).toHaveBeenCalled();
    const saveArgs = mockPermissionRepo.saveMany.mock.calls[0][0];
    expect(saveArgs.length).toBe(SYSTEM_PERMISSIONS.length);
    expect(saveArgs[0]).toBeInstanceOf(Permission);
  });

  it('does not write when every existing description already matches the catalog', async () => {
    const existing = SYSTEM_PERMISSIONS.map(
      (sp, index) =>
        new Permission({
          id: index + 1,
          code: sp.code,
          description: sp.description,
        }),
    );
    mockPermissionRepo.findAll.mockResolvedValue(Result.success(existing));

    await initializer.onApplicationBootstrap();

    expect(mockPermissionRepo.findAll).toHaveBeenCalled();
    expect(mockPermissionRepo.saveMany).not.toHaveBeenCalled();
  });

  it('updates an existing permission when its description differs from the catalog', async () => {
    const existing = SYSTEM_PERMISSIONS.map(
      (sp, index) =>
        new Permission({
          id: index + 1,
          code: sp.code,
          description:
            sp.code === 'manage_orders'
              ? 'Create, update, and delete orders'
              : sp.description,
        }),
    );
    mockPermissionRepo.findAll.mockResolvedValue(Result.success(existing));
    mockPermissionRepo.saveMany.mockResolvedValue(Result.success([]));

    await initializer.onApplicationBootstrap();

    expect(mockPermissionRepo.saveMany).toHaveBeenCalledTimes(1);
    const saveArgs = mockPermissionRepo.saveMany.mock.calls[0][0];
    expect(saveArgs).toHaveLength(1);
    expect(saveArgs[0].code).toBe('manage_orders');
    expect(saveArgs[0].id).toBe(
      existing.find((permission) => permission.code === 'manage_orders')?.id,
    );
    expect(saveArgs[0].description).toBe(
      SYSTEM_PERMISSIONS.find((sp) => sp.code === 'manage_orders')?.description,
    );
  });

  it('still inserts a missing code when other permissions already exist', async () => {
    const existing = [
      new Permission({
        id: 1,
        code: SYSTEM_PERMISSIONS[0].code,
        description: SYSTEM_PERMISSIONS[0].description,
      }),
    ];
    mockPermissionRepo.findAll.mockResolvedValue(Result.success(existing));
    mockPermissionRepo.saveMany.mockResolvedValue(Result.success([]));

    await initializer.onApplicationBootstrap();

    expect(mockPermissionRepo.findAll).toHaveBeenCalled();
    expect(mockPermissionRepo.saveMany).toHaveBeenCalled();
    const saveArgs = mockPermissionRepo.saveMany.mock.calls[0][0];
    expect(saveArgs.length).toBe(SYSTEM_PERMISSIONS.length - 1);
  });

  it('should not initialize permissions and log error if findAll fails', async () => {
    mockPermissionRepo.findAll.mockResolvedValue(
      ErrorFactory.RepositoryError('DB error'),
    );

    await initializer.onApplicationBootstrap();

    expect(mockPermissionRepo.findAll).toHaveBeenCalled();
    expect(mockPermissionRepo.saveMany).not.toHaveBeenCalled();
  });

  it('should skip init when already shutting down', async () => {
    lifecycle.isShuttingDown = true;

    await initializer.onApplicationBootstrap();

    expect(mockPermissionRepo.findAll).not.toHaveBeenCalled();
  });

  it('aborts without writing when shutdown starts after findAll', async () => {
    const existing = SYSTEM_PERMISSIONS.map(
      (sp, index) =>
        new Permission({
          id: index + 1,
          code: sp.code,
          description:
            sp.code === 'manage_orders' ? 'stale description' : sp.description,
        }),
    );
    mockPermissionRepo.findAll.mockImplementation(() => {
      lifecycle.isShuttingDown = true;
      return Promise.resolve(Result.success(existing));
    });

    await initializer.onApplicationBootstrap();

    expect(mockPermissionRepo.findAll).toHaveBeenCalled();
    expect(mockPermissionRepo.saveMany).not.toHaveBeenCalled();
  });

  it('should demote findAll failure to debug when shutting down mid-init', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error');
    const debugSpy = jest.spyOn(Logger.prototype, 'debug');

    mockPermissionRepo.findAll.mockImplementation(() => {
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
