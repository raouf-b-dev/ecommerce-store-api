import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import {
  RefreshTokenCookieInterceptor,
  REFRESH_COOKIE_NAME,
} from './refresh-token-cookie.interceptor';
import { EnvConfigService } from '../../../../config/env-config.service';
import { Result } from '../../../../shared-kernel/domain/result';

describe('RefreshTokenCookieInterceptor', () => {
  let interceptor: RefreshTokenCookieInterceptor;
  let mockConfigService: jest.Mocked<EnvConfigService>;

  beforeEach(() => {
    mockConfigService = {
      jwt: {
        refreshTokenTtl: '7d',
      },
    } as any;

    interceptor = new RefreshTokenCookieInterceptor(mockConfigService);
  });

  const createMockExecutionContext = (
    path: string,
    mockResponse: any,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ route: { path } }),
        getResponse: () => mockResponse,
      }),
    } as any;
  };

  it('should set cookie on /auth/login', (done) => {
    const mockResponse = { cookie: jest.fn() };
    const context = createMockExecutionContext('/auth/login', mockResponse);
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
    const context = createMockExecutionContext('/auth/logout', mockResponse);
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
