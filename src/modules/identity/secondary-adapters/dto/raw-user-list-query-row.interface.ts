export interface RawUserListQueryRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  roleCode?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
  addressCount?: number;
}
