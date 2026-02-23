import { Injectable, Logger } from '@nestjs/common';
import { AppError } from 'src/shared-kernel/errors/app.error';
import { Result } from 'src/shared-kernel/domain/result';
import { BaseJobHandler } from 'src/shared-kernel/infrastructure/jobs/base-job.handler';
import { UpdateNotificationStatusService } from '../../core/application/services/update-notification-status.service';
import { Job } from 'bullmq';
import { NotificationStatus } from '../../core/domain/enums/notification-status.enum';

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
