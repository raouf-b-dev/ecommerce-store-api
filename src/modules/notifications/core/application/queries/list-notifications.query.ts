export interface ListNotificationsQuery {
  page?: number;
  limit?: number;
  userId?: string;
  targetRole?: string;
  status?: string;
}
