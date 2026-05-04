export interface IUser {
  id: number | null;
  email: string;
  passwordHash: string;
  roleId: number | null;
  roleCode: string | null;
  isActive: boolean;
  customerId: number | null;
  createdAt: Date;
  updatedAt: Date;
}
