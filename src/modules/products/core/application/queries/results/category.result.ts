import { Category } from '../../../domain/entities/category';

export interface CategoryResult {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  /** Active products in this category (read-model projection). */
  productCount: number;
}

/**
 * Maps a write-model Category to a read result.
 * Prefer CategoryQueryService for catalog reads that need an accurate productCount.
 * Write-command responses may pass productCount explicitly (often 0 on create).
 */
export function toCategoryResult(
  category: Category,
  productCount = 0,
): CategoryResult {
  const primitives = category.toPrimitives();
  return {
    id: primitives.id!,
    name: primitives.name,
    slug: primitives.slug,
    description: primitives.description,
    isActive: primitives.isActive,
    productCount,
  };
}
