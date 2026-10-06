export interface RawCategoryQueryRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  productCount: number | null;
}
