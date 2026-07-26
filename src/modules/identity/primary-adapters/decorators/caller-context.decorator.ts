import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { createUserCallerContext } from '../../../../shared-kernel/domain/interfaces/caller-context.interface';

export const CallerCtx = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return createUserCallerContext({
      userId: user.userId,
      role: user.role,
      permissions: request.userPermissions || new Set<string>(),
    });
  },
);
