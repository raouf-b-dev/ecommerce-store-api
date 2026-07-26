import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { REFRESH_COOKIE_NAME } from '../interceptors/refresh-token-cookie.interceptor';

export const RefreshToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return (
      request.cookies?.[REFRESH_COOKIE_NAME] || request.body?.refreshToken || ''
    );
  },
);
