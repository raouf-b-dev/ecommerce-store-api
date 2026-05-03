export interface IUser {
  id: number | null;
  email: string;
  passwordHash: string;
  roleId: number | null;
  roleCode: string | null;
  customerId: number | null;
  createdAt: Date;
  updatedAt: Date;
}
