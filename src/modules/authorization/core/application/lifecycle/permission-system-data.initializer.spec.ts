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

    initializer = module.get<PermissionSystemDataInitializer>(
      PermissionSystemDataInitializer,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize permissions if none exist', async () => {
    mockPermissionRepo.findAll.mockResolvedValue(Result.success([]));
    mockPermissionRepo.saveMany.mockResolvedValue(Result.success([]));

    await initializer.onApplicationBootstrap();

    expect(mockPermissionRepo.findAll).toHaveBeenCalled();
    expect(mockPermissionRepo.saveMany).toHaveBeenCalled();
    const saveArgs = mockPermissionRepo.saveMany.mock.calls[0][0];
    expect(saveArgs.length).toBeGreaterThan(0);
    expect(saveArgs[0]).toBeInstanceOf(Permission);
  });

  it('should not initialize permissions if all exist', async () => {
    const existing = SYSTEM_PERMISSIONS.map(
      (sp: any) =>
        new Permission({ id: 0, code: sp.code, description: sp.description }),
    );
    mockPermissionRepo.findAll.mockResolvedValue(Result.success(existing));

    await initializer.onApplicationBootstrap();

    expect(mockPermissionRepo.findAll).toHaveBeenCalled();
    expect(mockPermissionRepo.saveMany).not.toHaveBeenCalled();
  });

  it('should not initialize permissions and log error if findAll fails', async () => {
    mockPermissionRepo.findAll.mockResolvedValue(
      ErrorFactory.RepositoryError('DB error'),
    );

    await initializer.onApplicationBootstrap();

    expect(mockPermissionRepo.findAll).toHaveBeenCalled();
    expect(mockPermissionRepo.saveMany).not.toHaveBeenCalled();
  });

  it('should only initialize missing permissions (partial seed)', async () => {
    // Existing only contains the first one
    const existing = [
      new Permission({
        id: 0,
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
    expect(saveArgs.length).toBe(SYSTEM_PERMISSIONS.length - 1); // Should save all except the first one
  });

  it('should skip init when already shutting down', async () => {
    lifecycle.isShuttingDown = true;

    await initializer.onApplicationBootstrap();

    expect(mockPermissionRepo.findAll).not.toHaveBeenCalled();
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
