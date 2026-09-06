export interface RawUserListQueryRow {
  id: number | string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  isActive: boolean | number | string;
  roleCode?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
  addressCount?: number | string;
}
