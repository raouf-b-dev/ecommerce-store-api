import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PermissionRepository } from '../../domain/repositories/permission.repository';
import { SYSTEM_PERMISSIONS } from '../../domain/reference-data/permission-definitions';
import { Permission } from '../../domain/entities/permission';
import { ApplicationLifecyclePort } from '../../../../../shared-kernel/domain/interfaces/application-lifecycle.port';

@Injectable()
export class PermissionSystemDataInitializer implements OnApplicationBootstrap {
  private readonly logger = new Logger(PermissionSystemDataInitializer.name);

  constructor(
    private readonly permissionRepo: PermissionRepository,
    private readonly lifecycle: ApplicationLifecyclePort,
  ) {}

  async onApplicationBootstrap() {
    if (this.lifecycle.isShuttingDown) {
      this.logger.debug('Skipping system permission init during shutdown');
      return;
    }

    this.logger.log('Initializing system permissions...');

    const existingResult = await this.permissionRepo.findAll();
    if (existingResult.isFailure) {
      this.logInitFailure(
        'Failed to load existing permissions',
        existingResult.error.message,
      );
      return;
    }

    if (this.lifecycle.isShuttingDown) {
      this.logger.debug('Aborting system permission init during shutdown');
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
        this.logInitFailure(
          'Failed to save system permissions.',
          saveResult.error.message,
        );
      }
    } else {
      this.logger.log('All system permissions are already up to date.');
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
