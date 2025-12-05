import { UserRoleType } from '../value-objects/user-role';

export interface IUser {
  id: string | null;
  email: string;
  passwordHash: string;
  role: UserRoleType;
  customerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
