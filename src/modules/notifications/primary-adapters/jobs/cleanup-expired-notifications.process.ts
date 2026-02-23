import { Injectable, Logger } from '@nestjs/common';
import { AppError } from 'src/shared-kernel/errors/app.error';
import { Result } from 'src/shared-kernel/domain/result';
import { BaseJobHandler } from 'src/shared-kernel/infrastructure/jobs/base-job.handler';
import { CleanupExpiredNotificationsService } from '../../core/application/services/cleanup-expired-notifications.service';
import { Job } from 'bullmq';

@Injectable()
export class CleanupExpiredNotificationsProcess extends BaseJobHandler<
  void,
  void
> {
  protected readonly logger = new Logger(
    CleanupExpiredNotificationsProcess.name,
  );

  constructor(
    private readonly cleanupService: CleanupExpiredNotificationsService,
  ) {
    super();
  }

  protected async onExecute(job: Job<void>): Promise<Result<void, AppError>> {
    return this.cleanupService.execute();
  }
}
