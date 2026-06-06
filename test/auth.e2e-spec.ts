import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from 'src/modules/auth/auth.controller';
import { RegisterUserUseCase } from 'src/modules/auth/core/application/usecases/register-user/register-user.usecase';
import { LoginUserUseCase } from 'src/modules/auth/core/application/usecases/login-user/login-user.usecase';
import { RefreshTokenUseCase } from 'src/modules/auth/core/application/usecases/refresh-token/refresh-token.usecase';
import { LogoutUseCase } from 'src/modules/auth/core/application/usecases/logout/logout.usecase';
import { LogoutAllUseCase } from 'src/modules/auth/core/application/usecases/logout-all/logout-all.usecase';
import { RegisterCommandTestFactory } from 'src/modules/auth/testing/factories/register-dto.factory';
import { LoginCommandTestFactory } from 'src/modules/auth/testing/factories/login-dto.factory';
import { UserTestFactory } from 'src/modules/auth/testing/factories/user.factory';
import { EnvConfigService } from 'src/config/env-config.service';
import { JwksPort } from 'src/infrastructure/jwt/ports/jwks.port';
import { GlobalExceptionFilter } from 'src/filters/global-exception.filter';
import { ResultInterceptor } from 'src/interceptors/result.interceptor';
import { SanitizeInterceptor } from 'src/interceptors/sanitize.interceptor';
import { Result } from 'src/shared-kernel/domain/result';
import { MockEnvConfigService } from 'src/testing/mocks/env-config.service.mock';
import { MockJwksService } from 'src/testing/mocks/jwks.service.mock';

describe('Auth HTTP contract (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  const mockUser = UserTestFactory.createMockUser({
    email: 'client-proof@example.com',
  });
  const registerDto = RegisterCommandTestFactory.createRegisterCommand({
    email: mockUser.email,
  });
  const loginDto = LoginCommandTestFactory.createLoginCommand({
    email: mockUser.email,
  });

  const registerUseCase = {
    execute: jest.fn(),
  };
  const loginUseCase = {
    execute: jest.fn(),
  };
  const refreshTokenUseCase = {
    execute: jest.fn(),
  };
  const logoutUseCase = {
    execute: jest.fn(),
  };
  const logoutAllUseCase = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    registerUseCase.execute.mockResolvedValue(
      Result.success({ user: mockUser, customerId: mockUser.customerId }),
    );
    loginUseCase.execute.mockResolvedValue(
      Result.success({
        accessToken: 'access-token-1',
        refreshToken: 'refresh-token-1',
      }),
    );
    refreshTokenUseCase.execute.mockResolvedValue(
      Result.success({
        accessToken: 'access-token-2',
        refreshToken: 'refresh-token-2',
      }),
    );
    logoutUseCase.execute.mockResolvedValue(Result.success(undefined));
    logoutAllUseCase.execute.mockResolvedValue(Result.success(undefined));

    moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: RegisterUserUseCase, useValue: registerUseCase },
        { provide: LoginUserUseCase, useValue: loginUseCase },
        { provide: RefreshTokenUseCase, useValue: refreshTokenUseCase },
        { provide: LogoutUseCase, useValue: logoutUseCase },
        { provide: LogoutAllUseCase, useValue: logoutAllUseCase },
        { provide: JwksPort, useClass: MockJwksService },
        { provide: EnvConfigService, useClass: MockEnvConfigService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalInterceptors(
      new SanitizeInterceptor(),
      new ResultInterceptor(),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('registers, logs in, refreshes, and logs out through HTTP', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(201)
      .expect(({ body }) => {
        expect(body.user.email).toBe(mockUser.email);
        expect(body.customerId).toBe(mockUser.customerId);
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginDto)
      .expect(200);

    expect(loginResponse.body).toEqual({
      accessToken: 'access-token-1',
      refreshToken: 'refresh-token-1',
    });
    expect(loginResponse.headers['set-cookie']?.[0]).toContain(
      'refresh_token=refresh-token-1',
    );
    expect(loginResponse.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(loginResponse.headers['set-cookie']?.[0]).toContain('Secure');
    expect(loginResponse.headers['set-cookie']?.[0]).toContain(
      'SameSite=Strict',
    );
    expect(loginResponse.headers['set-cookie']?.[0]).toContain('Path=/auth');

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'refresh-token-1' })
      .expect(200);

    expect(refreshResponse.body).toEqual({
      accessToken: 'access-token-2',
      refreshToken: 'refresh-token-2',
    });
    expect(refreshResponse.headers['set-cookie']?.[0]).toContain(
      'refresh_token=refresh-token-2',
    );
    expect(refreshResponse.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(refreshResponse.headers['set-cookie']?.[0]).toContain('Secure');
    expect(refreshResponse.headers['set-cookie']?.[0]).toContain(
      'SameSite=Strict',
    );
    expect(refreshResponse.headers['set-cookie']?.[0]).toContain('Path=/auth');

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: 'refresh-token-2' })
      .expect(204);

    expect(registerUseCase.execute).toHaveBeenCalledWith(registerDto);
    expect(registerUseCase.execute).toHaveBeenCalledTimes(1);
    expect(loginUseCase.execute).toHaveBeenCalledWith(loginDto);
    expect(loginUseCase.execute).toHaveBeenCalledTimes(1);
    expect(refreshTokenUseCase.execute).toHaveBeenCalledWith({
      refreshToken: 'refresh-token-1',
    });
    expect(refreshTokenUseCase.execute).toHaveBeenCalledTimes(1);
    expect(logoutUseCase.execute).toHaveBeenCalledWith({
      refreshToken: 'refresh-token-2',
    });
    expect(logoutUseCase.execute).toHaveBeenCalledTimes(1);
  });
});
