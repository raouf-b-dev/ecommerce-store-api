// src/modules/auth/auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { RegisterUserController } from './presentation/controllers/register-user/register-user.controller';
import { LoginUserController } from './presentation/controllers/login-user/login-user.controller';
import { UserTestFactory } from './testing/factories/user.factory';
import { RegisterDtoTestFactory } from './testing/factories/register-dto.factory';
import { LoginDtoTestFactory } from './testing/factories/login-dto.factory';

describe('AuthController', () => {
  let controller: AuthController;
  let registerController: RegisterUserController;
  let loginController: LoginUserController;
  let mockUser;
  let registerDto;
  let loginDto;

  beforeEach(async () => {
    mockUser = UserTestFactory.createMockUser();
    registerDto = RegisterDtoTestFactory.createRegisterDto();
    loginDto = LoginDtoTestFactory.createLoginDto();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: RegisterUserController,
          useValue: {
            handle: jest.fn().mockResolvedValue({
              user: mockUser,
              customerId: mockUser.customerId,
            }),
          },
        },
        {
          provide: LoginUserController,
          useValue: {
            handle: jest.fn().mockResolvedValue({ accessToken: '123' }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    registerController = module.get<RegisterUserController>(
      RegisterUserController,
    );
    loginController = module.get<LoginUserController>(LoginUserController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call RegisterUserController.handle when register is called and return its result', async () => {
    const res = await controller.register(registerDto);
    expect(registerController.handle).toHaveBeenCalledWith(registerDto);
    expect(res).toEqual({ user: mockUser, customerId: mockUser.customerId });
  });

  it('should call LoginUserController.handle when login is called and return its result', async () => {
    const res = await controller.login(loginDto);
    expect(loginController.handle).toHaveBeenCalledWith(loginDto);
    expect(res).toEqual({ accessToken: '123' });
  });
});
