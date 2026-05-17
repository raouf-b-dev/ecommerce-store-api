import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsController } from './permissions.controller';
import { FindAllPermissionsUseCase } from './core/application/usecases/find-all-permissions.usecase';
import { Result } from '../../shared-kernel/domain/result';

import { AuthGuard } from '../../guards/auth.guard';
import { PermissionsGuard } from './primary-adapters/guards/permissions.guard';

describe('PermissionsController', () => {
  let controller: PermissionsController;
  let mockFindAll: jest.Mocked<FindAllPermissionsUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [
        {
          provide: FindAllPermissionsUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PermissionsController>(PermissionsController);
    mockFindAll = module.get(FindAllPermissionsUseCase);
  });

  it('should delegate findAll to FindAllPermissionsUseCase', async () => {
    const permissions = [
      { id: 1, code: 'manage_users', description: 'Manage users' },
    ];
    mockFindAll.execute.mockResolvedValue(Result.success(permissions));

    const result = await controller.findAll();

    expect(result).toEqual(Result.success(permissions));
    expect(mockFindAll.execute).toHaveBeenCalled();
  });
});
