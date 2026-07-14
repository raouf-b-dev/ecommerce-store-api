import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { ResolveRolePermissionsService } from '../../core/application/services/resolve-role-permissions.service';
import { RolePermissionsVO } from '../../core/domain/value-objects/role-permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly resolveRolePermissionsService: ResolveRolePermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      request.userPermissions = RolePermissionsVO.fromCodes([]);
      return !requiredPermissions || requiredPermissions.length === 0;
    }

    const permissionsResult = await this.resolveRolePermissionsService.execute(
      user.role,
    );

    if (permissionsResult.isFailure) {
      this.logger.warn(
        `PermissionsGuard: Failed to resolve permissions: ${permissionsResult.error?.message}`,
      );
      return false;
    }

    const permissions = permissionsResult.value;
    // Attach to request for the @CallerCtx() decorator / other layers
    request.userPermissions = permissions;

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const hasPermission = requiredPermissions.some((permission) =>
      permissions.has(permission),
    );

    return hasPermission;
  }
}
