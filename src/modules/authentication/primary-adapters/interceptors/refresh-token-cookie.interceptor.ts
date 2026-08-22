import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import ms, { StringValue } from 'ms';
import { EnvConfigService } from '../../../../config/env-config.service';
import { DEFAULT_API_PREFIX } from '../../../../infrastructure/http/api-version';
import { getUnversionedRoutePath } from '../../../../shared-kernel/infra/http/request.helpers';

export const REFRESH_COOKIE_NAME = 'refresh_token';
export const REFRESH_COOKIE_PATH = `${DEFAULT_API_PREFIX}/authentication`;

/** Unversioned routes where the refresh token cookie should be set on success. */
const SET_COOKIE_ROUTES = ['/authentication/login', '/authentication/refresh'];

/** Unversioned routes where the refresh token cookie should be cleared on success. */
const CLEAR_COOKIE_ROUTES = [
  '/authentication/logout',
  '/authentication/logout-all',
];

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: REFRESH_COOKIE_PATH,
};

@Injectable()
export class RefreshTokenCookieInterceptor implements NestInterceptor {
  private readonly cookieMaxAge: number;

  constructor(private readonly configService: EnvConfigService) {
    this.cookieMaxAge = ms(
      this.configService.jwt.refreshTokenTtl as StringValue,
    );
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

        if (SET_COOKIE_ROUTES.includes(path)) {
          const refreshToken = result.value?.refreshToken;
          if (refreshToken) {
            response.cookie(REFRESH_COOKIE_NAME, refreshToken, {
              ...COOKIE_OPTIONS,
              maxAge: this.cookieMaxAge,
            });
          }
        }

        if (CLEAR_COOKIE_ROUTES.includes(path)) {
          response.clearCookie(REFRESH_COOKIE_NAME, COOKIE_OPTIONS);
        }

        return result;
      }),
    );
  }
}
