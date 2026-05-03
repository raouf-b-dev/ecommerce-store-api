import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { FindAllRolesUseCase } from './core/application/usecases/role/find-all-roles.usecase';
import { FindRoleByIdUseCase } from './core/application/usecases/role/find-role-by-id.usecase';
import { CreateRoleUseCase } from './core/application/usecases/role/create-role.usecase';
import { UpdateRoleUseCase } from './core/application/usecases/role/update-role.usecase';
import { DeleteRoleUseCase } from './core/application/usecases/role/delete-role.usecase';
import { Result } from '../../shared-kernel/domain/result';

import { AuthGuard } from '../../guards/auth.guard';
import { PermissionsGuard } from './primary-adapters/guards/permissions.guard';

describe('RolesController', () => {
  let controller: RolesController;
  let mockFindAll: jest.Mocked<FindAllRolesUseCase>;
  let mockFindById: jest.Mocked<FindRoleByIdUseCase>;
  let mockCreate: jest.Mocked<CreateRoleUseCase>;
  let mockUpdate: jest.Mocked<UpdateRoleUseCase>;
  let mockDelete: jest.Mocked<DeleteRoleUseCase>;

  beforeEach(async () => {
    mockFindAll = { execute: jest.fn() } as any;
    mockFindById = { execute: jest.fn() } as any;
    mockCreate = { execute: jest.fn() } as any;
    mockUpdate = { execute: jest.fn() } as any;
    mockDelete = { execute: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        { provide: FindAllRolesUseCase, useValue: mockFindAll },
        { provide: FindRoleByIdUseCase, useValue: mockFindById },
        { provide: CreateRoleUseCase, useValue: mockCreate },
        { provide: UpdateRoleUseCase, useValue: mockUpdate },
        { provide: DeleteRoleUseCase, useValue: mockDelete },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RolesController>(RolesController);
  });

  it('should delegate findAll to FindAllRolesUseCase', async () => {
    const roles = [
      {
        id: 1,
        code: 'ADMIN',
        name: 'Admin',
        isSystem: true,
        permissions: { codes: [] },
      },
    ];
    mockFindAll.execute.mockResolvedValue(Result.success(roles));

    const result = await controller.findAll();

    expect(result).toEqual(Result.success(roles));
    expect(mockFindAll.execute).toHaveBeenCalled();
  });

  it('should delegate findOne to FindRoleByIdUseCase', async () => {
    const role = {
      id: 1,
      code: 'ADMIN',
      name: 'Admin',
      isSystem: true,
      permissions: { codes: [] },
    };
    mockFindById.execute.mockResolvedValue(Result.success(role));

    const result = await controller.findOne(1);

    expect(result).toEqual(Result.success(role));
    expect(mockFindById.execute).toHaveBeenCalledWith(1);
  });

  it('should delegate create to CreateRoleUseCase', async () => {
    const dto = { code: 'TEST', name: 'Test', permissions: [] };
    const role = {
      id: 2,
      code: 'TEST',
      name: 'Test',
      isSystem: false,
      permissions: { codes: [] },
    };
    mockCreate.execute.mockResolvedValue(Result.success(role));

    const result = await controller.create(dto);

    expect(result).toEqual(Result.success(role));
    expect(mockCreate.execute).toHaveBeenCalledWith(dto);
  });

  it('should delegate update to UpdateRoleUseCase', async () => {
    const dto = { name: 'Updated', permissions: [] };
    mockUpdate.execute.mockResolvedValue(Result.success(undefined as any));

    const result = await controller.update(1, dto);

    expect(result).toEqual(Result.success(undefined));
    expect(mockUpdate.execute).toHaveBeenCalledWith({ id: 1, ...dto });
  });

  it('should delegate delete to DeleteRoleUseCase', async () => {
    mockDelete.execute.mockResolvedValue(Result.success(undefined as any));

    const result = await controller.delete(1);

    expect(result).toEqual(Result.success(undefined));
    expect(mockDelete.execute).toHaveBeenCalledWith(1);
  });
});
