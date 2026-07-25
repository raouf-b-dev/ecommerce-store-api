import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AuthenticationController } from 'src/modules/authentication/authentication.controller';
import { RegisterUserUseCase } from 'src/modules/authentication/core/application/usecases/register-user/register-user.usecase';
import { LoginUserUseCase } from 'src/modules/authentication/core/application/usecases/login-user/login-user.usecase';
import { RefreshTokenUseCase } from 'src/modules/authentication/core/application/usecases/refresh-token/refresh-token.usecase';
import { LogoutUseCase } from 'src/modules/authentication/core/application/usecases/logout/logout.usecase';
import { LogoutAllUseCase } from 'src/modules/authentication/core/application/usecases/logout-all/logout-all.usecase';
import { AuthenticationDtoFactory } from 'src/modules/authentication/testing/factories/authentication-dto.factory';
import { UserTestFactory } from 'src/modules/access/testing/factories/user.factory';
import { EnvConfigService } from 'src/config/env-config.service';
import { JwksPort } from 'src/infrastructure/jwt/ports/jwks.port';
import { GlobalExceptionFilter } from 'src/filters/global-exception.filter';
import { ResultInterceptor } from 'src/interceptors/result.interceptor';
import { SanitizeInterceptor } from 'src/interceptors/sanitize.interceptor';
import { Result } from 'src/shared-kernel/domain/result';
import { MockEnvConfigService } from 'src/testing/mocks/env-config.service.mock';
import { MockJwksService } from 'src/testing/mocks/jwks.service.mock';

describe('Authentication HTTP contract (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  const mockUser = UserTestFactory.createMockUser({
    email: 'client-proof@example.com',
  });
  const registerDto = AuthenticationDtoFactory.createRegisterCommand({
    email: mockUser.email,
  });
  const loginDto = AuthenticationDtoFactory.createLoginCommand({
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
      Result.success({ user: mockUser, id: mockUser.id }),
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
      controllers: [AuthenticationController],
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
      .post('/authentication/register')
      .send(registerDto)
      .expect(201)
      .expect(({ body }) => {
        expect(body.user.email).toBe(mockUser.email);
        expect(body.id).toBe(mockUser.id);
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/authentication/login')
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
    expect(loginResponse.headers['set-cookie']?.[0]).toContain(
      'Path=/authentication',
    );

    const refreshResponse = await request(app.getHttpServer())
      .post('/authentication/refresh')
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
    expect(refreshResponse.headers['set-cookie']?.[0]).toContain(
      'Path=/authentication',
    );

    await request(app.getHttpServer())
      .post('/authentication/logout')
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
