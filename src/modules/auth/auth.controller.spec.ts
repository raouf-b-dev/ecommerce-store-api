// src/modules/auth/auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { RegisterUserUseCase } from './core/application/usecases/register-user/register-user.usecase';
import { LoginUserUseCase } from './core/application/usecases/login-user/login-user.usecase';
import { UserTestFactory } from './testing/factories/user.factory';
import { RegisterDtoTestFactory } from './testing/factories/register-dto.factory';
import { LoginDtoTestFactory } from './testing/factories/login-dto.factory';
import { Result } from '../../shared-kernel/domain/result';

describe('AuthController', () => {
  let controller: AuthController;
  let registerUseCase: RegisterUserUseCase;
  let loginUseCase: LoginUserUseCase;
  let mockUser;
  let registerDto;
  let loginDto;

  beforeEach(async () => {
    mockUser = UserTestFactory.createMockUser();
    mockUser.toPrimitives = jest.fn().mockReturnValue(mockUser);
    registerDto = RegisterDtoTestFactory.createRegisterDto();
    loginDto = LoginDtoTestFactory.createLoginDto();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: RegisterUserUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(
              Result.success({
                user: mockUser,
                customerId: mockUser.customerId,
              }),
            ),
          },
        },
        {
          provide: LoginUserUseCase,
          useValue: {
            execute: jest
              .fn()
              .mockResolvedValue(Result.success({ accessToken: '123' })),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    registerUseCase = module.get<RegisterUserUseCase>(RegisterUserUseCase);
    loginUseCase = module.get<LoginUserUseCase>(LoginUserUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call RegisterUserUseCase.execute when register is called and return its result', async () => {
    const res = await controller.register(registerDto);
    expect(registerUseCase.execute).toHaveBeenCalledWith(registerDto);
    expect(res).toEqual(
      Result.success({
        user: mockUser.toPrimitives(),
        customerId: mockUser.customerId,
      }),
    );
  });

  it('should call LoginUserUseCase.execute when login is called and return its result', async () => {
    const res = await controller.login(loginDto);
    expect(loginUseCase.execute).toHaveBeenCalledWith(loginDto);
    expect(res).toEqual(Result.success({ accessToken: '123' }));
  });
});
