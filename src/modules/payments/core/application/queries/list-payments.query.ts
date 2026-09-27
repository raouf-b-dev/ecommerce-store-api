export interface ListPaymentsQuery {
  page?: number;
  limit?: number;
  status?: string;
  userId?: number;
  requestedUserId?: number;
  authorizedUserId?: number;
  orderId?: number;
  userEmail?: string;
  userName?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  sortDirection?: 'ASC' | 'DESC' | 'asc' | 'desc';
}
