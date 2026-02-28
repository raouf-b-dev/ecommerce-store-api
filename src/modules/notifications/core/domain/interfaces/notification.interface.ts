import { NotificationStatus } from '../enums/notification-status.enum';

export interface INotification {
  id: string;
  userId: string | null;
  targetRole: string | null;
  type: string;
  title: string;
  message: string;
  payload?: any;
  status: NotificationStatus;
  failedReason?: string | null;
  deliveredAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
}
