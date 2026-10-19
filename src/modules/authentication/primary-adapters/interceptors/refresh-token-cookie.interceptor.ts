import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import ms from 'ms';
import { AuthCookieSameSite } from '../../../../config/validate-env';
import { EnvConfigService } from '../../../../config/env-config.service';
import { DEFAULT_API_PREFIX } from '../../../../infrastructure/http/api-version';
import { getUnversionedRoutePath } from '../../../../shared-kernel/infra/http/request.helpers';

export const REFRESH_COOKIE_NAME = 'refresh_token';
export const REFRESH_COOKIE_PATH = `${DEFAULT_API_PREFIX}/authentication`;

/** Unversioned routes where the refresh token cookie should be set on success. */
const SET_COOKIE_ROUTES = [
  '/authentication/login',
  '/authentication/refresh',
  '/authentication/change-password',
];

/** Unversioned routes where the refresh token cookie should be cleared on success. */
const CLEAR_COOKIE_ROUTES = [
  '/authentication/logout',
  '/authentication/logout-all',
];

/**
 * Refresh cookie flags. `secure` is always true. `sameSite: 'none'` is only
 * accepted at boot when PUBLIC_BASE_URL is https (see assertAuthCookieSameSite).
 */
export function buildRefreshCookieOptions(sameSite: AuthCookieSameSite): {
  httpOnly: true;
  secure: true;
  sameSite: AuthCookieSameSite;
  path: string;
} {
  return {
    httpOnly: true,
    secure: true,
    sameSite,
    path: REFRESH_COOKIE_PATH,
  };
}

@Injectable()
export class RefreshTokenCookieInterceptor implements NestInterceptor {
  private readonly cookieMaxAge: number;

  constructor(private readonly configService: EnvConfigService) {
    this.cookieMaxAge = ms(this.configService.jwt.refreshTokenTtl);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const path = getUnversionedRoutePath(request);

    return next.handle().pipe(
      map((result) => {
        if (!result || !result.isSuccess) {
          return result;
        }

        const cookieOptions = buildRefreshCookieOptions(
          this.configService.auth.cookieSameSite,
        );

        if (SET_COOKIE_ROUTES.includes(path)) {
          const refreshToken = result.value?.refreshToken;
          if (refreshToken) {
            response.cookie(REFRESH_COOKIE_NAME, refreshToken, {
              ...cookieOptions,
              maxAge: this.cookieMaxAge,
            });
          }
        }

        if (CLEAR_COOKIE_ROUTES.includes(path)) {
          response.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);
        }

        return result;
      }),
    );
  }
}
