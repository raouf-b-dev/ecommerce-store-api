/**
 * Represents the raw query result row returned by the TypeORM query builder
 * when selecting flat order list projections across cross-context JOINs.
 */
export interface RawOrderListQueryRow {
  id: number;
  userId: number;
  userName?: string | null;
  userEmail?: string | null;
  status: string;
  itemCount: number;
  totalAmount: number;
  createdAt: Date | string;
}
