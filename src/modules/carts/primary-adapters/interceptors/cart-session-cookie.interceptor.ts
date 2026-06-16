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
import {
  CART_SESSION_COOKIE_NAME,
  CART_SESSION_HEADER_NAME,
} from '../constants/cart-session.constants';

const SET_COOKIE_ROUTES = ['/carts'];

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
};

@Injectable()
export class CartSessionCookieInterceptor implements NestInterceptor {
  private readonly cookieMaxAge: number;

  constructor(private readonly configService: EnvConfigService) {
    this.cookieMaxAge = ms(
      this.configService.jwt.cartSessionTtl as StringValue,
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const routePath = request.route?.path;
    const path = typeof routePath === 'string' ? routePath : request.path;

    return next.handle().pipe(
      map(
        (
          result:
            | { isSuccess: boolean; value?: { token?: string } }
            | null
            | undefined,
        ) => {
          if (
            !result ||
            !result.isSuccess ||
            !SET_COOKIE_ROUTES.includes(path)
          ) {
            return result;
          }

          const token = result.value?.token;
          if (token) {
            response.cookie(CART_SESSION_COOKIE_NAME, token, {
              ...COOKIE_OPTIONS,
              maxAge: this.cookieMaxAge,
            });
            response.setHeader(CART_SESSION_HEADER_NAME, token);
          }

          return result;
        },
      ),
    );
  }
}
