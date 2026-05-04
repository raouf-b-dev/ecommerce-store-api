import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import * as ms from 'ms';
import { EnvConfigService } from '../../../../config/env-config.service';

export const REFRESH_COOKIE_NAME = 'refresh_token';

/** Routes where the refresh token cookie should be set on success. */
const SET_COOKIE_ROUTES = ['/auth/login', '/auth/refresh'];

/** Routes where the refresh token cookie should be cleared on success. */
const CLEAR_COOKIE_ROUTES = ['/auth/logout', '/auth/logout-all'];

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/auth',
};

@Injectable()
export class RefreshTokenCookieInterceptor implements NestInterceptor {
  private readonly cookieMaxAge: number;

  constructor(private readonly configService: EnvConfigService) {
    this.cookieMaxAge = ms(
      this.configService.jwt.refreshTokenTtl as ms.StringValue,
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse<Response>();
    const path = request.route?.path || request.path;

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
