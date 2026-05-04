import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { ResolveRolePermissionsService } from '../../core/application/services/resolve-role-permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private resolveRolePermissionsService: ResolveRolePermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      this.logger.warn(
        'PermissionsGuard: No authenticated user found on request',
      );
      return false;
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
    // Attach to request for the @UserPermissions() decorator
    request.userPermissions = permissions;

    const hasPermission = requiredPermissions.some((permission) =>
      permissions.has(permission),
    );

    if (!hasPermission) {
      return false;
    }

    return true;
  }
}
