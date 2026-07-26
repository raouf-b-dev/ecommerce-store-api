import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { FindAllRolesUseCase } from './core/application/usecases/role/find-all-roles.usecase';
import { FindRoleByIdUseCase } from './core/application/usecases/role/find-role-by-id.usecase';
import { CreateRoleUseCase } from './core/application/usecases/role/create-role.usecase';
import { UpdateRoleUseCase } from './core/application/usecases/role/update-role.usecase';
import { DeleteRoleUseCase } from './core/application/usecases/role/delete-role.usecase';
import { Result } from '../../shared-kernel/domain/result';
import { IRole } from './core/domain/interfaces/role.interface';
import { AuthorizationDtoFactory } from './testing/factories/authorization.dto.factory';
import { CreateRoleDto } from './primary-adapter/dto/create-role.dto';

describe('RolesController', () => {
  let controller: RolesController;
  let mockFindAll: jest.Mocked<FindAllRolesUseCase>;
  let mockFindById: jest.Mocked<FindRoleByIdUseCase>;
  let mockCreate: jest.Mocked<CreateRoleUseCase>;
  let mockUpdate: jest.Mocked<UpdateRoleUseCase>;
  let mockDelete: jest.Mocked<DeleteRoleUseCase>;
  let role: IRole;
  let createRoleDto: CreateRoleDto;
  beforeEach(async () => {
    createRoleDto = AuthorizationDtoFactory.createCreateRoleDto();
    role = AuthorizationDtoFactory.buildPrimitives({
      id: 1,
      code: 'MANAGER',
      name: 'Manager',
      isSystem: false,
      permissions: { codes: ['manage_products'] },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        { provide: FindAllRolesUseCase, useValue: { execute: jest.fn() } },
        { provide: FindRoleByIdUseCase, useValue: { execute: jest.fn() } },
        { provide: CreateRoleUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateRoleUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteRoleUseCase, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
    mockFindAll = module.get(FindAllRolesUseCase);
    mockFindById = module.get(FindRoleByIdUseCase);
    mockCreate = module.get(CreateRoleUseCase);
    mockUpdate = module.get(UpdateRoleUseCase);
    mockDelete = module.get(DeleteRoleUseCase);
  });

  it('should delegate findAll to FindAllRolesUseCase', async () => {
    mockFindAll.execute.mockResolvedValue(Result.success([role]));

    const result = await controller.findAll();

    expect(result).toEqual(Result.success([role]));
    expect(mockFindAll.execute).toHaveBeenCalled();
  });

  it('should delegate findOne to FindRoleByIdUseCase', async () => {
    mockFindById.execute.mockResolvedValue(Result.success(role));

    const result = await controller.findOne(1);

    expect(result).toEqual(Result.success(role));
    expect(mockFindById.execute).toHaveBeenCalledWith(1);
  });

  it('should delegate create to CreateRoleUseCase', async () => {
    mockCreate.execute.mockResolvedValue(Result.success(role));

    const result = await controller.create(createRoleDto);

    expect(result).toEqual(Result.success(role));
    expect(mockCreate.execute).toHaveBeenCalledWith(createRoleDto);
  });

  it('should delegate update to UpdateRoleUseCase', async () => {
    mockUpdate.execute.mockResolvedValue(Result.success<void>(undefined));

    const result = await controller.update(1, createRoleDto);

    expect(result).toEqual(Result.success(undefined));
    expect(mockUpdate.execute).toHaveBeenCalledWith({
      id: 1,
      ...createRoleDto,
    });
  });

  it('should delegate delete to DeleteRoleUseCase', async () => {
    mockDelete.execute.mockResolvedValue(Result.success<void>(undefined));

    const result = await controller.delete(1);

    expect(result).toEqual(Result.success(undefined));
    expect(mockDelete.execute).toHaveBeenCalledWith(1);
  });
});
