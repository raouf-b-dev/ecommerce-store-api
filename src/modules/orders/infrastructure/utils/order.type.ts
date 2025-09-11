import { IOrder } from '../../domain/interfaces/IOrder';

export type OrderForCache = Omit<IOrder, 'createdAt' | 'updatedAt'> & {
  createdAt: number;
  updatedAt?: number | null;
};
