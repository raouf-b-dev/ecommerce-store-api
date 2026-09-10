export interface RawCategoryQueryRow {
  id: number | string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean | number | string;
  productCount: number | string | null;
}
