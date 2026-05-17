import { CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import {
  RefreshTokenCookieInterceptor,
  REFRESH_COOKIE_NAME,
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

  it('should set cookie on /auth/login', (done) => {
    const mockResponse = { cookie: jest.fn() };
    const context = createMockExecutionContext(
      { route: { path: '/auth/login' } },
      mockResponse,
    );
    const next: CallHandler = {
      handle: () => of(Result.success({ refreshToken: 'token123' })),
    };

    interceptor.intercept(context, next).subscribe(() => {
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        'token123',
        expect.objectContaining({ httpOnly: true }),
      );
      done();
    });
  });

  it('should clear cookie on /auth/logout', (done) => {
    const mockResponse = { clearCookie: jest.fn() };
    const context = createMockExecutionContext(
      { route: { path: '/auth/logout' } },
      mockResponse,
    );
    const next: CallHandler = {
      handle: () => of(Result.success(undefined)),
    };

    interceptor.intercept(context, next).subscribe(() => {
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        expect.objectContaining({ httpOnly: true }),
      );
      done();
    });
  });
});
