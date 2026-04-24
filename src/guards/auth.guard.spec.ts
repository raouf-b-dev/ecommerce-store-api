import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockJwtVerifierService } from '../testing/mocks/jwt-verifier.service.mock';
import { AuthGuard } from './auth.guard';
import { JwtVerifierService } from '../infrastructure/jwt/jwt-verifier.service';
import { Reflector } from '@nestjs/core';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtVerifierService: MockJwtVerifierService;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    jwtVerifierService = new MockJwtVerifierService();
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: JwtVerifierService, useValue: jwtVerifierService },
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
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;

    expect(await guard.canActivate(mockContext)).toBe(true);
  });

  it('should attach user payload on valid token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtVerifierService.verifyAccessToken.mockResolvedValue({
      sub: '1',
      email: 'test@example.com',
      role: 'ADMIN',
    });

    const request = { headers: { authorization: 'Bearer test-token' } };
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;

    expect(await guard.canActivate(mockContext)).toBe(true);
    expect((request as any).user).toEqual({
      userId: '1',
      email: 'test@example.com',
      role: 'ADMIN',
    });
  });

  it('should throw if token misses', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const request = { headers: {} };
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
