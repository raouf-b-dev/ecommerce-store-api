import { UserRoleType } from '../value-objects/user-role';

export interface IUser {
  id: number | null;
  email: string;
  passwordHash: string;
  role: UserRoleType;
  customerId: number | null;
  createdAt: Date;
  updatedAt: Date;
}
