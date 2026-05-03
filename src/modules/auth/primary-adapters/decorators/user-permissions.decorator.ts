import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RolePermissionsVO } from '../../core/domain/value-objects/role-permissions';

export const UserPermissions = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RolePermissionsVO => {
    const request = ctx.switchToHttp().getRequest();
    return request.userPermissions;
  },
);
