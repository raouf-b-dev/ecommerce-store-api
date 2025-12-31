import { CreateFromEntity } from 'src/shared/infrastructure/mappers/utils/create-from-entity.type';
import { Notification } from '../../../domain/entities/notification';
import { NotificationEntity } from '../../orm/notification.schema';
import { NotificationStatus } from '../../../domain/enums/notification-status.enum';

type NotificationCreate = CreateFromEntity<NotificationEntity>;

export class NotificationMapper {
  static toDomain(entity: NotificationEntity): Notification {
    return Notification.fromPrimitives({
      id: entity.id,
      userId: entity.userId,
      targetRole: entity.targetRole,
      type: entity.type,
      title: entity.title,
      message: entity.message,
      payload: entity.payload,
      status: entity.status as NotificationStatus,
      failedReason: entity.failedReason,
      deliveredAt: entity.deliveredAt,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
    });
  }

  static toEntity(domain: Notification): NotificationEntity {
    const createFromEntity: NotificationCreate = {
      id: domain.id,
      userId: domain.userId,
      targetRole: domain.targetRole,
      type: domain.type,
      title: domain.title,
      message: domain.message,
      payload: domain.payload,
      status: domain.status,
      failedReason: domain.failedReason,
      deliveredAt: domain.deliveredAt,
      expiresAt: domain.expiresAt,
      createdAt: domain.createdAt,
    };
    const notificationEntity: NotificationEntity = Object.assign(
      new NotificationEntity(),
      createFromEntity,
    );
    return notificationEntity;
  }

  static toDomainArray(entities: NotificationEntity[]): Notification[] {
    return entities.map((entity) => this.toDomain(entity));
  }

  static toEntityArray(domains: Notification[]): NotificationEntity[] {
    return domains.map((domain) => this.toEntity(domain));
  }
}
