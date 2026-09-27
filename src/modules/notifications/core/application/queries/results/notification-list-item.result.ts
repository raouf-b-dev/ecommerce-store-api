export interface NotificationListItemDTO {
  id: string;
  userId: string | null;
  targetRole: string | null;
  type: string;
  title: string;
  message: string;
  payload: any;
  status: string;
  createdAt: string;
}
