import { Test, TestingModule } from '@nestjs/testing';
import { PermissionSystemDataInitializer } from './permission-system-data.initializer';
import { PermissionRepository } from '../../domain/repositories/permission.repository';
import { Result } from '../../../../../shared-kernel/domain/result';
import { Permission } from '../../domain/entities/permission';
import { MockPermissionRepository } from '../../../testing/mocks/permission-repository.mock';
import { SYSTEM_PERMISSIONS } from '../../domain/reference-data/permission-definitions';

describe('PermissionSystemDataInitializer', () => {
  let initializer: PermissionSystemDataInitializer;
  let mockPermissionRepo: MockPermissionRepository;

  beforeEach(async () => {
    mockPermissionRepo = new MockPermissionRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionSystemDataInitializer,
        {
          provide: PermissionRepository,
          useValue: mockPermissionRepo,
        },
      ],
    }).compile();

    initializer = module.get<PermissionSystemDataInitializer>(
      PermissionSystemDataInitializer,
    );
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
      Result.failure(new Error('DB error') as any),
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
});
