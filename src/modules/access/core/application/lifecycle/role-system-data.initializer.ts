import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { SYSTEM_ROLES } from '../../domain/reference-data/system-roles';
import { Role } from '../../domain/entities/role';

@Injectable()
export class RoleSystemDataInitializer implements OnApplicationBootstrap {
  private readonly logger = new Logger(RoleSystemDataInitializer.name);

  constructor(private readonly roleRepo: RoleRepository) {}

  async onApplicationBootstrap() {
    this.logger.log('Initializing system roles...');

    for (const sysRole of SYSTEM_ROLES) {
      const roleResult = await this.roleRepo.findByCode(sysRole.code);

      if (roleResult.isFailure) {
        this.logger.error(`Failed to lookup role: ${sysRole.code}`);
        continue;
      }

      const existingRole = roleResult.value;

      if (!existingRole) {
        // Create new
        const newRole = new Role({
          id: 0,
          code: sysRole.code,
          name: sysRole.name,
          isSystem: sysRole.isSystem,
          permissions: sysRole.permissions,
        });

        const saveResult = await this.roleRepo.save(newRole);
        if (saveResult.isSuccess) {
          this.logger.log(`Created system role: ${sysRole.code}`);
        } else {
          this.logger.error(`Failed to create system role: ${sysRole.code}`);
        }
      } else {
        // Update permissions for existing system role
        existingRole.updatePermissions(sysRole.permissions);
        const updateResult = await this.roleRepo.update(existingRole);
        if (updateResult.isSuccess) {
          this.logger.log(
            `Updated permissions for system role: ${sysRole.code}`,
          );
        } else {
          this.logger.error(`Failed to update system role: ${sysRole.code}`);
        }
      }
    }
  }
}
