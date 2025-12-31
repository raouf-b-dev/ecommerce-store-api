import { Injectable, Logger } from '@nestjs/common';
import { AppError } from 'src/core/errors/app.error';
import { Result } from 'src/core/domain/result';
import { BaseJobHandler } from 'src/core/infrastructure/jobs/base-job.handler';
import { UpdateNotificationStatusService } from '../../application/services/update-notification-status.service';
import { NotificationStatus } from '../../domain/enums/notification-status.enum';
import { Job } from 'bullmq';

interface UpdateStatusProps {
  notificationId: string;
  status: NotificationStatus;
  reason?: string;
}

@Injectable()
export class UpdateNotificationStatusProcess extends BaseJobHandler<
  UpdateStatusProps,
  void
> {
  protected readonly logger = new Logger(UpdateNotificationStatusProcess.name);

  constructor(
    private readonly updateNotificationStatusService: UpdateNotificationStatusService,
  ) {
    super();
  }

  protected async onExecute(
    job: Job<UpdateStatusProps>,
  ): Promise<Result<void, AppError>> {
    const { notificationId, status, reason } = job.data;
    return this.updateNotificationStatusService.execute({
      notificationId,
      status,
      reason,
    });
  }
}
