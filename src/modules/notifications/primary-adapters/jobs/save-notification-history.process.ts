import { Injectable, Logger } from '@nestjs/common';
import { AppError } from 'src/shared-kernel/errors/app.error';
import { Result } from 'src/shared-kernel/domain/result';
import { BaseJobHandler } from 'src/shared-kernel/infrastructure/jobs/base-job.handler';
import { SaveNotificationHistoryService } from '../../core/application/services/save-notification-history.service';
import { INotification } from '../../core/domain/interfaces/notification.interface';
import { Notification } from '../../core/domain/entities/notification';
import { Job } from 'bullmq';

@Injectable()
export class SaveNotificationHistoryProcess extends BaseJobHandler<
  INotification,
  void
> {
  protected readonly logger = new Logger(SaveNotificationHistoryProcess.name);

  constructor(
    private readonly saveNotificationHistoryService: SaveNotificationHistoryService,
  ) {
    super();
  }

  protected async onExecute(
    job: Job<INotification>,
  ): Promise<Result<void, AppError>> {
    const notification = Notification.fromPrimitives(job.data);
    return this.saveNotificationHistoryService.execute({ notification });
  }
}
