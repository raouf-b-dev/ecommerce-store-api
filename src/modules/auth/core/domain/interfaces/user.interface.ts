export interface IUser {
  id: number | null;
  email: string;
  passwordHash: string;
  mustChangePassword: boolean;
  roleId: number | null;
  isActive: boolean;
  customerId: number | null;
  createdAt: Date;
  updatedAt: Date;
}
