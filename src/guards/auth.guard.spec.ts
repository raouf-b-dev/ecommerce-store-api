import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { JwtVerifierPort } from '../shared-kernel/domain/interfaces/jwt-verifier.port';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { IS_OPTIONAL_AUTH_KEY } from './decorators/optional-auth.decorator';
import {
  MockJwtVerifierService,
  MockReflector,
  createMockExecutionContext,
  createMockRequest,
} from '../testing';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtVerifierService: MockJwtVerifierService;
  let reflector: MockReflector;

  beforeEach(async () => {
    jwtVerifierService = new MockJwtVerifierService();
    reflector = new MockReflector();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: JwtVerifierPort, useValue: jwtVerifierService },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true if public route', async () => {
    reflector.getAllAndOverride.mockImplementation(
      (key) => key === IS_PUBLIC_KEY,
    );
    const mockContext = createMockExecutionContext();

    expect(await guard.canActivate(mockContext)).toBe(true);
  });

  it('should attach user payload on valid token', async () => {
    reflector.getAllAndOverride.mockImplementation(() => false);
    jwtVerifierService.verifyAccessToken.mockResolvedValue({
      sub: '1',
      email: 'test@example.com',
      role: 'ADMIN',
      iss: 'test-issuer',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const request = createMockRequest({
      headers: { authorization: 'Bearer test-token' },
    });
    const mockContext = createMockExecutionContext(request);

    expect(await guard.canActivate(mockContext)).toBe(true);
    expect((request as any).user).toEqual({
      userId: 1,
      email: 'test@example.com',
      role: 'ADMIN',
      mustChangePassword: false,
    });
  });

  it('should throw if token is missing on required auth route', async () => {
    reflector.getAllAndOverride.mockImplementation(() => false);

    const request = createMockRequest({ headers: {} });
    const mockContext = createMockExecutionContext(request);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should return true and set user to undefined if token is missing on optional auth route', async () => {
    reflector.getAllAndOverride.mockImplementation(
      (key) => key === IS_OPTIONAL_AUTH_KEY,
    );

    const request = createMockRequest({ headers: {} });
    const mockContext = createMockExecutionContext(request);

    expect(await guard.canActivate(mockContext)).toBe(true);
    expect((request as any).user).toBeUndefined();
  });

  it('should throw if token is invalid on optional auth route', async () => {
    reflector.getAllAndOverride.mockImplementation(
      (key) => key === IS_OPTIONAL_AUTH_KEY,
    );
    jwtVerifierService.verifyAccessToken.mockRejectedValue(
      new Error('Invalid token'),
    );

    const request = createMockRequest({
      headers: { authorization: 'Bearer bad-token' },
    });
    const mockContext = createMockExecutionContext(request);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should attach user payload on valid token on optional auth route', async () => {
    reflector.getAllAndOverride.mockImplementation(
      (key) => key === IS_OPTIONAL_AUTH_KEY,
    );
    jwtVerifierService.verifyAccessToken.mockResolvedValue({
      sub: '2',
      email: 'customer@example.com',
      role: 'CUSTOMER',
      iss: 'test-issuer',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const request = createMockRequest({
      headers: { authorization: 'Bearer test-token' },
    });
    const mockContext = createMockExecutionContext(request);

    expect(await guard.canActivate(mockContext)).toBe(true);
    expect((request as any).user).toEqual({
      userId: 2,
      email: 'customer@example.com',
      role: 'CUSTOMER',
      mustChangePassword: false,
    });
  });

  it('should propagate the mustChangePassword claim onto the request user', async () => {
    reflector.getAllAndOverride.mockImplementation(() => false);
    jwtVerifierService.verifyAccessToken.mockResolvedValue({
      sub: '3',
      email: 'seeded@example.com',
      role: 'ADMIN',
      mustChangePassword: true,
      iss: 'test-issuer',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const request = createMockRequest({
      headers: { authorization: 'Bearer test-token' },
    });

    expect(await guard.canActivate(createMockExecutionContext(request))).toBe(
      true,
    );
    expect((request as any).user.mustChangePassword).toBe(true);
  });
});
