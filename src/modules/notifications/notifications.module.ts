import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { WebsocketModule } from 'src/infrastructure/websocket/websocket.module';
import { NotificationEntity } from './secondary-adapters/orm/notification.schema';
import { PostgresNotificationRepository } from './secondary-adapters/repositories/postgres.notification.repository';
import { NotificationRepository } from './core/domain/repositories/notification.repository';
import { NotificationGateway } from './core/domain/gateways/notification.gateway.interface';
import { WebsocketNotificationGateway } from './secondary-adapters/gateways/websocket.notification.gateway';
import { DeliverNotificationService } from './core/application/services/deliver-notification.service';
import { SaveNotificationHistoryService } from './core/application/services/save-notification-history.service';
import { UpdateNotificationStatusService } from './core/application/services/update-notification-status.service';
import { CleanupExpiredNotificationsService } from './core/application/services/cleanup-expired-notifications.service';
import { GetUserNotificationsUseCase } from './core/application/usecases/get-user-notifications.usecase';
import { MarkNotificationAsReadUseCase } from './core/application/usecases/mark-notification-as-read.usecase';
import { NotificationsController } from './notifications.controller';
import { NotificationScheduler } from './core/domain/schedulers/notification.scheduler';
import { BullMqNotificationScheduler } from './secondary-adapters/schedulers/bullmq.notification-scheduler';
import { DeliverNotificationProcess } from './primary-adapters/jobs/deliver-notification.process';
import { SaveNotificationHistoryProcess } from './primary-adapters/jobs/save-notification-history.process';
import { UpdateNotificationStatusProcess } from './primary-adapters/jobs/update-notification-status.process';
import { CleanupExpiredNotificationsProcess } from './primary-adapters/jobs/cleanup-expired-notifications.process';
import { NotificationsProcessor } from './notifications.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity]),
    WebsocketModule,
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    // Infrastructure
    {
      provide: NotificationRepository,
      useClass: PostgresNotificationRepository,
    },
    {
      provide: NotificationGateway,
      useClass: WebsocketNotificationGateway,
    },
    {
      provide: NotificationScheduler,
      useClass: BullMqNotificationScheduler,
    },

    // Application Services
    DeliverNotificationService,
    SaveNotificationHistoryService,
    UpdateNotificationStatusService,
    CleanupExpiredNotificationsService,

    // Use Cases
    GetUserNotificationsUseCase,
    MarkNotificationAsReadUseCase,

    // Jobs (Processes)
    DeliverNotificationProcess,
    SaveNotificationHistoryProcess,
    UpdateNotificationStatusProcess,
    CleanupExpiredNotificationsProcess,

    // Processor
    NotificationsProcessor,
  ],
  exports: [DeliverNotificationService],
})
export class NotificationsModule {}
