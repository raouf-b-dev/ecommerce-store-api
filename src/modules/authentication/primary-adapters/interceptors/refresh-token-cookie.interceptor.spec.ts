import { CallHandler } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import {
  buildRefreshCookieOptions,
  RefreshTokenCookieInterceptor,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
} from './refresh-token-cookie.interceptor';
import { Result } from '../../../../shared-kernel/domain/result';
import {
  createMockExecutionContext,
  MockEnvConfigService,
} from '../../../../testing';

describe('RefreshTokenCookieInterceptor', () => {
  let interceptor: RefreshTokenCookieInterceptor;
  let mockConfigService: MockEnvConfigService;

  beforeEach(() => {
    mockConfigService = new MockEnvConfigService();
    interceptor = new RefreshTokenCookieInterceptor(mockConfigService);
  });

  it.each([
    '/authentication/login',
    '/v1/authentication/login',
    '/authentication/change-password',
    '/v1/authentication/change-password',
    '/authentication/refresh',
    '/v1/authentication/refresh',
  ])('should set cookie on %s with versioned path', async (routePath) => {
    const mockResponse = { cookie: jest.fn() };
    const context = createMockExecutionContext(
      { route: { path: routePath } },
      mockResponse,
    );
    const next: CallHandler = {
      handle: () => of(Result.success({ refreshToken: 'token123' })),
    };

    await firstValueFrom(interceptor.intercept(context, next));

    expect(mockResponse.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'token123',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: REFRESH_COOKIE_PATH,
      }),
    );
  });

  it.each(['/authentication/logout', '/v1/authentication/logout'])(
    'should clear cookie on %s with versioned path',
    async (routePath) => {
      const mockResponse = { clearCookie: jest.fn() };
      const context = createMockExecutionContext(
        { route: { path: routePath } },
        mockResponse,
      );
      const next: CallHandler = {
        handle: () => of(Result.success(undefined)),
      };

      await firstValueFrom(interceptor.intercept(context, next));

      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: REFRESH_COOKIE_PATH,
        }),
      );
    },
  );

  it('sets SameSite=None and secure when configured', async () => {
    mockConfigService.setMockConfig({
      auth: { cookieSameSite: 'none' },
    });
    const mockResponse = { cookie: jest.fn() };
    const context = createMockExecutionContext(
      { route: { path: '/authentication/login' } },
      mockResponse,
    );
    const next: CallHandler = {
      handle: () => of(Result.success({ refreshToken: 'token123' })),
    };

    await firstValueFrom(interceptor.intercept(context, next));

    expect(mockResponse.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'token123',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: REFRESH_COOKIE_PATH,
      }),
    );
  });
});

describe('buildRefreshCookieOptions', () => {
  it('forces secure true for strict, lax, and none', () => {
    expect(buildRefreshCookieOptions('strict')).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
    });
    expect(buildRefreshCookieOptions('lax').secure).toBe(true);
    expect(buildRefreshCookieOptions('none')).toMatchObject({
      secure: true,
      sameSite: 'none',
    });
  });
});
