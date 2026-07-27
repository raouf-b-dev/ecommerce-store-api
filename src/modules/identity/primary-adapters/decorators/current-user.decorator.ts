// src/modules/identity/primary-adapters/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserPayload } from '../../../../shared-kernel/domain/interfaces/current-user.interface';
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
