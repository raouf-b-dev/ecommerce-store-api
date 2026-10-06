export interface RawNotificationListQueryRow {
  id: string;
  userId?: string | null;
  targetRole?: string | null;
  type: string;
  title: string;
  message: string;
  payload?: Record<string, unknown> | null;
  status: string;
  createdAt: Date | string;
}
