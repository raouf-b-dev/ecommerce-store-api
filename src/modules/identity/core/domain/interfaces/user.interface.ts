import { IAddress } from './address.interface';

export interface IUser {
  id: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  addresses: IAddress[];
  createdAt: Date;
  updatedAt: Date;
}
