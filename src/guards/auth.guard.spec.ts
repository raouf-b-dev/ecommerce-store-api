import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { JwtVerifierPort } from '../infrastructure/jwt/ports/jwt-verifier.port';
import { Reflector } from '@nestjs/core';
import {
  MockJwtVerifierService,
  MockReflector,
  createMockExecutionContext,
  createMockRequest,
} from '../testing';

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
    reflector.getAllAndOverride.mockReturnValue(true);
    const mockContext = createMockExecutionContext();

    expect(await guard.canActivate(mockContext)).toBe(true);
  });

  it('should attach user payload on valid token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtVerifierService.verifyAccessToken.mockResolvedValue({
      sub: '1',
      email: 'test@example.com',
      role: 'ADMIN',
      customerId: null,
      iss: 'test-issuer',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const request = createMockRequest({
      headers: { authorization: 'Bearer test-token' },
    });
    const mockContext = createMockExecutionContext(request);

    expect(await guard.canActivate(mockContext)).toBe(true);
    expect((request as unknown as Record<string, any>).user).toEqual({
      userId: 1,
      email: 'test@example.com',
      role: 'ADMIN',
      customerId: null,
    });
  });

  it('should throw if token misses', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const request = createMockRequest({ headers: {} });
    const mockContext = createMockExecutionContext(request);

    await expect(guard.canActivate(mockContext)).rejects.toThrow();
  });
});
