import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  CART_SESSION_COOKIE_NAME,
  CART_SESSION_HEADER_NAME,
} from '../constants/cart-session.constants';

export const CartToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();

    const headerToken = request.headers[CART_SESSION_HEADER_NAME];
    if (typeof headerToken === 'string' && headerToken.length > 0) {
      return headerToken;
    }

    const cookieToken = request.cookies?.[CART_SESSION_COOKIE_NAME];
    if (typeof cookieToken === 'string' && cookieToken.length > 0) {
      return cookieToken;
    }

    return null;
  },
);
