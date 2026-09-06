export interface UserListItemDTO {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  roleCode: string | null;
  createdAt: string;
}
