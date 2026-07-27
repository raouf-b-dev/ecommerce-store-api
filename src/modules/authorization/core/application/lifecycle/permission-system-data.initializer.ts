import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PermissionRepository } from '../../domain/repositories/permission.repository';
import { SYSTEM_PERMISSIONS } from '../../domain/reference-data/permission-definitions';
import { Permission } from '../../domain/entities/permission';

@Injectable()
export class PermissionSystemDataInitializer implements OnApplicationBootstrap {
  private readonly logger = new Logger(PermissionSystemDataInitializer.name);

  constructor(private readonly permissionRepo: PermissionRepository) {}

  async onApplicationBootstrap() {
    this.logger.log('Initializing system permissions...');

    const existingResult = await this.permissionRepo.findAll();
    if (existingResult.isFailure) {
      this.logger.error('Failed to load existing permissions');
      return;
    }

    const existingCodes = existingResult.value.map((p) => p.code);
    const toCreate = SYSTEM_PERMISSIONS.filter(
      (sp) => !existingCodes.includes(sp.code),
    );

    if (toCreate.length > 0) {
      const permissions = toCreate.map((sp) => {
        return new Permission({
          id: 0,
          code: sp.code,
          description: sp.description,
        });
      });

      const saveResult = await this.permissionRepo.saveMany(permissions);
      if (saveResult.isSuccess) {
        this.logger.log(`Created ${toCreate.length} system permissions.`);
      } else {
        this.logger.error('Failed to save system permissions.');
      }
    } else {
      this.logger.log('All system permissions are already up to date.');
    }
  }
}
