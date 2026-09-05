import { Category } from '../../../domain/entities/category';

export interface CategoryResult {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
}

export function toCategoryResult(category: Category): CategoryResult {
  const primitives = category.toPrimitives();
  return {
    id: primitives.id!,
    name: primitives.name,
    slug: primitives.slug,
    description: primitives.description,
    isActive: primitives.isActive,
  };
}
