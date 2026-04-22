// src/modules/auth/auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { RegisterUserUseCase } from './core/application/usecases/register-user/register-user.usecase';
import { LoginUserUseCase } from './core/application/usecases/login-user/login-user.usecase';
import { RefreshTokenUseCase } from './core/application/usecases/refresh-token/refresh-token.usecase';
import { LogoutUseCase } from './core/application/usecases/logout/logout.usecase';
import { LogoutAllUseCase } from './core/application/usecases/logout-all/logout-all.usecase';
import { UserTestFactory } from './testing/factories/user.factory';
import { RegisterDtoTestFactory } from './testing/factories/register-dto.factory';
import { LoginDtoTestFactory } from './testing/factories/login-dto.factory';
import { Result } from '../../shared-kernel/domain/result';
import { JwksService } from '../../infrastructure/jwt/jwks.service';
import { MockJwksService } from '../../testing/mocks/jwks.service.mock';
import { EnvConfigService } from '../../config/env-config.service';
import { RegisterDto } from './primary-adapters/dto/register.dto';
import { LoginDto } from './primary-adapters/dto/login.dto';
import { RefreshTokenDto } from './primary-adapters/dto/refresh-token.dto';
import { User } from './core/domain/entities/user';
import { Request, Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let registerUseCase: RegisterUserUseCase;
  let loginUseCase: LoginUserUseCase;
  let refreshTokenUseCase: RefreshTokenUseCase;
  let logoutUseCase: LogoutUseCase;
  let logoutAllUseCase: LogoutAllUseCase;
  let jwksService: MockJwksService;

  let mockUser: Partial<User> & { toPrimitives: jest.Mock };
  let registerDto: RegisterDto;
  let loginDto: LoginDto;
  let mockRes: any;
  let mockReq: any;

  beforeEach(async () => {
    mockUser = UserTestFactory.createMockUser() as unknown as Partial<User> & {
      toPrimitives: jest.Mock;
    };
    mockUser.toPrimitives = jest.fn().mockReturnValue(mockUser);
    registerDto = RegisterDtoTestFactory.createRegisterDto();
    loginDto = LoginDtoTestFactory.createLoginDto();

    mockRes = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    mockReq = {
      cookies: {},
    };

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
            execute: jest.fn().mockResolvedValue(
              Result.success({
                accessToken: 'access-123',
                refreshToken: 'refresh-456',
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
          provide: JwksService,
          useValue: new MockJwksService(),
        },
        {
          provide: EnvConfigService,
          useValue: {
            jwt: {
              refreshTokenTtl: '7d',
            },
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    registerUseCase = module.get<RegisterUserUseCase>(RegisterUserUseCase);
    loginUseCase = module.get<LoginUserUseCase>(LoginUserUseCase);
    refreshTokenUseCase = module.get<RefreshTokenUseCase>(RefreshTokenUseCase);
    logoutUseCase = module.get<LogoutUseCase>(LogoutUseCase);
    logoutAllUseCase = module.get<LogoutAllUseCase>(LogoutAllUseCase);
    jwksService = module.get<JwksService>(
      JwksService,
    ) as unknown as MockJwksService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call RegisterUserUseCase.execute when register is called', async () => {
    const res = await controller.register(registerDto);
    expect(registerUseCase.execute).toHaveBeenCalledWith(registerDto);
    expect(res).toEqual(
      Result.success({
        user: mockUser.toPrimitives(),
        customerId: mockUser.customerId,
      }),
    );
  });

  it('should set refresh token cookie on login', async () => {
    const res = await controller.login(loginDto, mockRes);

    expect(loginUseCase.execute).toHaveBeenCalledWith(loginDto);
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-456',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/auth',
      }),
    );
    expect(res).toEqual(
      Result.success({
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
      }),
    );
  });

  it('should read refresh token from body on refresh', async () => {
    const dto: RefreshTokenDto = { refreshToken: 'refresh-456' };
    const res = await controller.refresh(
      dto,
      mockReq as Request,
      mockRes as Response,
    );

    expect(refreshTokenUseCase.execute).toHaveBeenCalledWith({
      refreshToken: 'refresh-456',
    });
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'new-refresh-456',
      expect.objectContaining({ httpOnly: true }),
    );
    expect((res as any).value.accessToken).toBe('new-access-123');
  });

  it('should read refresh token from cookie when body is empty', async () => {
    mockReq.cookies = { refresh_token: 'cookie-refresh-789' };
    const dto: RefreshTokenDto = {};
    await controller.refresh(dto, mockReq as Request, mockRes as Response);

    expect(refreshTokenUseCase.execute).toHaveBeenCalledWith({
      refreshToken: 'cookie-refresh-789',
    });
  });

  it('should clear cookie on logout', async () => {
    const dto: RefreshTokenDto = { refreshToken: 'refresh-456' };
    await controller.logout(dto, mockReq as Request, mockRes as Response);

    expect(logoutUseCase.execute).toHaveBeenCalledWith({
      refreshToken: 'refresh-456',
    });
    expect(mockRes.clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/auth',
      }),
    );
  });

  it('should clear cookie on logout-all', async () => {
    const dto: RefreshTokenDto = { refreshToken: 'refresh-456' };
    await controller.logoutAll(dto, mockReq as Request, mockRes as Response);

    expect(logoutAllUseCase.execute).toHaveBeenCalledWith({
      refreshToken: 'refresh-456',
    });
    expect(mockRes.clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('should call getJwks and return keys', () => {
    const res = controller.getJwks();
    expect(jwksService.getJwks).toHaveBeenCalled();
    expect(res).toEqual({ keys: [] });
  });
});
