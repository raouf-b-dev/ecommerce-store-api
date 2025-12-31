import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { DeliverNotificationProcess } from './presentation/jobs/deliver-notification.process';
import { SaveNotificationHistoryProcess } from './presentation/jobs/save-notification-history.process';
import { UpdateNotificationStatusProcess } from './presentation/jobs/update-notification-status.process';
import { CleanupExpiredNotificationsProcess } from './presentation/jobs/cleanup-expired-notifications.process';
import { JobNames } from 'src/core/infrastructure/jobs/job-names';

@Processor('notifications', { concurrency: 10 })
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly deliverNotificationProcess: DeliverNotificationProcess,
    private readonly saveNotificationHistoryProcess: SaveNotificationHistoryProcess,
    private readonly updateNotificationStatusProcess: UpdateNotificationStatusProcess,
    private readonly cleanupExpiredNotificationsProcess: CleanupExpiredNotificationsProcess,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case JobNames.SEND_NOTIFICATION:
        return this.deliverNotificationProcess.handle(job);
      case JobNames.SAVE_NOTIFICATION_HISTORY:
        return this.saveNotificationHistoryProcess.handle(job);
      case JobNames.UPDATE_NOTIFICATION_STATUS:
        return this.updateNotificationStatusProcess.handle(job);
      case JobNames.CLEANUP_NOTIFICATIONS:
        return this.cleanupExpiredNotificationsProcess.handle(job);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(`Processing job ${job.id} of type ${job.name}...`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} of type ${job.name} completed.`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Job ${job.id} of type ${job.name} failed: ${err.message}`,
      err.stack,
    );
  }
}
