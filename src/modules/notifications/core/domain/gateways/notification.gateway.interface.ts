import { NotificationPayload } from '../types/notification-payload.type';

export abstract class NotificationGateway {
  abstract send(userId: string, payload: NotificationPayload): Promise<void>;
}
