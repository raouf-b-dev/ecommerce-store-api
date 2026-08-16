import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { Result } from '../../shared-kernel/domain/result';
import { DeleteUserUseCase } from './core/application/usecases/user/delete-user/delete-user.usecase';
import { GetUserUseCase } from './core/application/usecases/user/get-user/get-user.usecase';
import { ListUsersUseCase } from './core/application/usecases/user/list-users/list-users.usecase';
import { UpdateUserUseCase } from './core/application/usecases/user/update-user/update-user.usecase';
import { ActivateUserUseCase } from './core/application/usecases/user/activate-user/activate-user.usecase';
import { DeactivateUserUseCase } from './core/application/usecases/user/deactivate-user/deactivate-user.usecase';
import { AuthPayloadFactory } from '../../testing/factories/auth-payload.factory';
import { ListUsersQueryDto } from './primary-adapters/dto/list-users-query.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let getUserUseCase: jest.Mocked<GetUserUseCase>;
  let listUsersUseCase: jest.Mocked<ListUsersUseCase>;
  let updateUserUseCase: jest.Mocked<UpdateUserUseCase>;
  let deleteUserUseCase: jest.Mocked<DeleteUserUseCase>;
  let activateUserUseCase: jest.Mocked<ActivateUserUseCase>;
  let deactivateUserUseCase: jest.Mocked<DeactivateUserUseCase>;
  const callerContext = AuthPayloadFactory.createCustomerContext();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: GetUserUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: ListUsersUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: UpdateUserUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: DeleteUserUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: ActivateUserUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: DeactivateUserUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    getUserUseCase = module.get(GetUserUseCase);
    listUsersUseCase = module.get(ListUsersUseCase);
    updateUserUseCase = module.get(UpdateUserUseCase);
    deleteUserUseCase = module.get(DeleteUserUseCase);
    activateUserUseCase = module.get(ActivateUserUseCase);
    deactivateUserUseCase = module.get(DeactivateUserUseCase);
  });

  it('should delegate listUsers to ListUsersUseCase', async () => {
    const query = new ListUsersQueryDto();
    await controller.listUsers(query);
    expect(listUsersUseCase.execute).toHaveBeenCalledWith(query);
  });

  it('should delegate getUser to GetUserUseCase', async () => {
    await controller.getUser(1, callerContext);
    expect(getUserUseCase.execute).toHaveBeenCalledWith({
      userId: 1,
      callerContext,
    });
  });

  it('should delegate updateUser to UpdateUserUseCase', async () => {
    const dto = { firstName: 'Jane' };
    await controller.updateUser(1, dto);
    expect(updateUserUseCase.execute).toHaveBeenCalledWith({ id: 1, ...dto });
  });

  it('should delegate deleteUser to DeleteUserUseCase', async () => {
    await controller.deleteUser(1);
    expect(deleteUserUseCase.execute).toHaveBeenCalledWith(1);
  });

  it('should delegate activate to ActivateUserUseCase', async () => {
    await controller.activate(1);
    expect(activateUserUseCase.execute).toHaveBeenCalledWith(1);
  });

  it('should delegate deactivate to DeactivateUserUseCase', async () => {
    await controller.deactivate(1);
    expect(deactivateUserUseCase.execute).toHaveBeenCalledWith(1);
  });
});
