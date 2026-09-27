import { CallHandler } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import {
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
          path: REFRESH_COOKIE_PATH,
        }),
      );
    },
  );
});
