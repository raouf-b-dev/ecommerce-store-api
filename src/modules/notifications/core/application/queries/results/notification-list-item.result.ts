export interface NotificationListItemDTO {
  id: string;
  userId: string | null;
  targetRole: string | null;
  type: string;
  title: string;
  message: string;
  payload: Record<string, unknown> | null;
  status: string;
  createdAt: string;
}
