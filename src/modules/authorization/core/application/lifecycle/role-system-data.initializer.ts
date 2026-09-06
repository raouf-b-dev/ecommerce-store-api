import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { SYSTEM_ROLES } from '../../domain/reference-data/system-roles';
import { Role } from '../../domain/entities/role';
import { RolePermissionsVO } from '../../domain/value-objects/role-permissions';
import { ApplicationLifecyclePort } from '../../../../../shared-kernel/domain/interfaces/application-lifecycle.port';
import { PermissionSystemDataInitializer } from './permission-system-data.initializer';

@Injectable()
export class RoleSystemDataInitializer implements OnApplicationBootstrap {
  private readonly logger = new Logger(RoleSystemDataInitializer.name);

  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly lifecycle: ApplicationLifecyclePort,
    private readonly permissionInitializer: PermissionSystemDataInitializer,
  ) {}

  async onApplicationBootstrap() {
    if (this.lifecycle.isShuttingDown) {
      this.logger.debug('Skipping system role init during shutdown');
      return;
    }

    // Role→permission links resolve by permission code. Permissions must exist
    // first or SUPER_ADMIN/ADMIN are stored with an empty grant set (HTTP 403).
    await this.permissionInitializer.ensureInitialized();

    this.logger.log('Initializing system roles...');

    for (const sysRole of SYSTEM_ROLES) {
      if (this.lifecycle.isShuttingDown) {
        this.logger.debug('Aborting system role init during shutdown');
        return;
      }

      const roleResult = await this.roleRepo.findByCode(sysRole.code);

      if (roleResult.isFailure) {
        this.logInitFailure(
          `Failed to lookup role: ${sysRole.code}`,
          roleResult.error.message,
        );
        continue;
      }

      const existingRole = roleResult.value;

      if (!existingRole) {
        const newRole = Role.createSystem(
          sysRole.code,
          sysRole.name,
          sysRole.permissions,
        );

        const saveResult = await this.roleRepo.save(newRole);
        if (saveResult.isSuccess) {
          this.logger.log(`Created system role: ${sysRole.code}`);
        } else {
          this.logInitFailure(
            `Failed to create system role: ${sysRole.code}`,
            saveResult.error.message,
          );
        }
        continue;
      }

      const desiredPermissions = RolePermissionsVO.fromCodes(
        sysRole.permissions,
      );
      const permissionsMatch =
        existingRole.permissions.equals(desiredPermissions);
      const needsSystemFlag = !existingRole.isSystem;

      if (permissionsMatch && !needsSystemFlag) {
        this.logger.debug(`System role already up to date: ${sysRole.code}`);
        continue;
      }

      const roleToUpdate = needsSystemFlag
        ? Role.fromPrimitives({
            ...existingRole.toPrimitives(),
            isSystem: true,
            name: sysRole.name,
            permissions: { codes: sysRole.permissions },
          })
        : existingRole;

      if (!needsSystemFlag) {
        roleToUpdate.updatePermissions(sysRole.permissions);
      }

      const updateResult = await this.roleRepo.update(roleToUpdate);
      if (updateResult.isSuccess) {
        this.logger.log(
          needsSystemFlag
            ? `Corrected system role: ${sysRole.code}`
            : `Updated permissions for system role: ${sysRole.code}`,
        );
      } else {
        this.logInitFailure(
          `Failed to update system role: ${sysRole.code}`,
          updateResult.error.message,
        );
      }
    }
  }

  private logInitFailure(message: string, detail?: string) {
    if (this.lifecycle.isShuttingDown) {
      this.logger.debug(`${message} (ignored during shutdown)`);
      return;
    }
    this.logger.error(detail ? `${message}: ${detail}` : message);
  }
}
