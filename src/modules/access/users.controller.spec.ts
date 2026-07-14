import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { Result } from '../../shared-kernel/domain/result';
import { DeleteUserUseCase } from './core/application/usecases/user/delete-user/delete-user.usecase';
import { GetUserUseCase } from './core/application/usecases/user/get-user/get-user.usecase';
import { ListUsersUseCase } from './core/application/usecases/user/list-users/list-users.usecase';
import { UpdateUserUseCase } from './core/application/usecases/user/update-user/update-user.usecase';
import { ActivateUserUseCase } from './core/application/usecases/user/activate-user/activate-user.usecase';
import { DeactivateUserUseCase } from './core/application/usecases/user/deactivate-user/deactivate-user.usecase';

describe('UsersController', () => {
  let controller: UsersController;

  let getCustomerUseCase: GetUserUseCase;
  let listCustomersUseCase: ListUsersUseCase;
  let updateCustomerUseCase: UpdateUserUseCase;
  let deleteCustomerUseCase: DeleteUserUseCase;
  let activateUserUseCase: ActivateUserUseCase;
  let deactivateUserUseCase: DeactivateUserUseCase;

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

    getCustomerUseCase = module.get<GetUserUseCase>(GetUserUseCase);
    listCustomersUseCase = module.get<ListUsersUseCase>(ListUsersUseCase);
    updateCustomerUseCase = module.get<UpdateUserUseCase>(UpdateUserUseCase);
    deleteCustomerUseCase = module.get<DeleteUserUseCase>(DeleteUserUseCase);
    activateUserUseCase = module.get<ActivateUserUseCase>(ActivateUserUseCase);
    deactivateUserUseCase = module.get<DeactivateUserUseCase>(
      DeactivateUserUseCase,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
