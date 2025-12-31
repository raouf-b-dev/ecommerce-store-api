import { Injectable, Logger } from '@nestjs/common';
import { AppError } from 'src/core/errors/app.error';
import { Result } from 'src/core/domain/result';
import { BaseJobHandler } from 'src/core/infrastructure/jobs/base-job.handler';
import { CleanupExpiredNotificationsService } from '../../application/services/cleanup-expired-notifications.service';
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
