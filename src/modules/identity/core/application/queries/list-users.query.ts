export interface ListUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  roleCode?: string;
  authorizedUserId?: number;
}
