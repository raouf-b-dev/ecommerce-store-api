export interface ListUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  authorizedUserId?: number;
}
