// src/modules/authentication/authentication.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationController } from './authentication.controller';
import { RegisterUserUseCase } from './core/application/usecases/register-user/register-user.usecase';
import { LoginUserUseCase } from './core/application/usecases/login-user/login-user.usecase';
import { RefreshTokenUseCase } from './core/application/usecases/refresh-token/refresh-token.usecase';
import { LogoutUseCase } from './core/application/usecases/logout/logout.usecase';
import { LogoutAllUseCase } from './core/application/usecases/logout-all/logout-all.usecase';
import { ChangePasswordUseCase } from './core/application/usecases/change-password/change-password.usecase';
import { UserTestFactory } from 'src/modules/identity/testing';
import { Result } from '../../shared-kernel/domain/result';
import { JwksPort } from '../../infrastructure/jwt/ports/jwks.port';
import { MockJwksService } from 'src/testing';
import { EnvConfigService } from '../../config/env-config.service';
import { RegisterDto } from './primary-adapters/dto/register.dto';
import { LoginDto } from './primary-adapters/dto/login.dto';
import { RefreshTokenDto } from './primary-adapters/dto/refresh-token.dto';
import { IUser } from '../identity/core/domain/interfaces/user.interface';
import { MockEnvConfigService } from 'src/testing';
import { AuthenticationDtoFactory } from 'src/modules/authentication/testing';

describe('AuthController', () => {
  let controller: AuthenticationController;
  let registerUseCase: RegisterUserUseCase;
  let loginUseCase: LoginUserUseCase;
  let refreshTokenUseCase: RefreshTokenUseCase;
  let logoutUseCase: LogoutUseCase;
  let logoutAllUseCase: LogoutAllUseCase;
  let changePasswordUseCase: ChangePasswordUseCase;
  let jwksService: MockJwksService;

  let mockUser: IUser;
  let registerDto: RegisterDto;
  let loginDto: LoginDto;

  beforeEach(async () => {
    mockUser = UserTestFactory.createMockUser();
    registerDto = AuthenticationDtoFactory.createRegisterCommand();
    loginDto = AuthenticationDtoFactory.createLoginCommand();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        {
          provide: RegisterUserUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(
              Result.success({
                user: mockUser,
                userId: mockUser.id,
              }),
            ),
          },
        },
        {
          provide: LoginUserUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(
              Result.success({
                accessToken: 'access-123',
                refreshToken: 'refresh-456',
                mustChangePassword: false,
                permissions: ['access_admin'],
              }),
            ),
          },
        },
        {
          provide: RefreshTokenUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(
              Result.success({
                accessToken: 'new-access-123',
                refreshToken: 'new-refresh-456',
                mustChangePassword: false,
                permissions: ['access_admin'],
              }),
            ),
          },
        },
        {
          provide: LogoutUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: LogoutAllUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: ChangePasswordUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(
              Result.success({
                accessToken: 'changed-access',
                refreshToken: 'changed-refresh',
                mustChangePassword: false,
                permissions: ['access_admin'],
              }),
            ),
          },
        },
        {
          provide: JwksPort,
          useClass: MockJwksService,
        },
        {
          provide: EnvConfigService,
          useClass: MockEnvConfigService,
        },
      ],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
    registerUseCase = module.get<RegisterUserUseCase>(RegisterUserUseCase);
    loginUseCase = module.get<LoginUserUseCase>(LoginUserUseCase);
    refreshTokenUseCase = module.get<RefreshTokenUseCase>(RefreshTokenUseCase);
    logoutUseCase = module.get<LogoutUseCase>(LogoutUseCase);
    logoutAllUseCase = module.get<LogoutAllUseCase>(LogoutAllUseCase);
    changePasswordUseCase = module.get<ChangePasswordUseCase>(
      ChangePasswordUseCase,
    );
    jwksService = module.get(JwksPort);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call RegisterUserUseCase.execute when register is called', async () => {
    const res = await controller.register(registerDto);
    expect(registerUseCase.execute).toHaveBeenCalledWith(registerDto);
    expect(res).toEqual(
      Result.success({
        user: mockUser,
        userId: mockUser.id,
      }),
    );
  });

  it('should return login tokens successfully', async () => {
    const res = await controller.login(loginDto);

    expect(loginUseCase.execute).toHaveBeenCalledWith(loginDto);
    expect(res).toEqual(
      Result.success({
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        mustChangePassword: false,
        permissions: ['access_admin'],
      }),
    );
  });

  it('should change password for authenticated user', async () => {
    const dto = { currentPassword: 'Old123!', newPassword: 'New456!' };
    const res = await controller.changePassword(99, dto);

    expect(changePasswordUseCase.execute).toHaveBeenCalledWith({
      userId: 99,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });
    expect(res).toEqual(
      Result.success({
        accessToken: 'changed-access',
        refreshToken: 'changed-refresh',
        mustChangePassword: false,
        permissions: ['access_admin'],
      }),
    );
  });

  it('should read refresh token from body on refresh', async () => {
    const dto: RefreshTokenDto = { refreshToken: 'refresh-456' };
    const res = await controller.refresh('refresh-456', dto);

    expect(refreshTokenUseCase.execute).toHaveBeenCalledWith('refresh-456');
    if (res.isSuccess) {
      expect(res.value.accessToken).toBe('new-access-123');
    }
  });

  it('should read refresh token from cookie when body is empty', async () => {
    const dto: RefreshTokenDto = {};
    await controller.refresh('cookie-refresh-789', dto);

    expect(refreshTokenUseCase.execute).toHaveBeenCalledWith(
      'cookie-refresh-789',
    );
  });

  it('should execute logout', async () => {
    const dto: RefreshTokenDto = { refreshToken: 'refresh-456' };
    await controller.logout('refresh-456', dto);

    expect(logoutUseCase.execute).toHaveBeenCalledWith('refresh-456');
  });

  it('should execute logout-all', async () => {
    const dto: RefreshTokenDto = { refreshToken: 'refresh-456' };
    await controller.logoutAll('refresh-456', dto);

    expect(logoutAllUseCase.execute).toHaveBeenCalledWith('refresh-456');
  });

  it('should call getJwks and return keys', () => {
    const res = controller.getJwks();
    expect(jwksService.getJwks).toHaveBeenCalled();
    expect(res).toEqual({ keys: [] });
  });
});
