import { Category } from '../../../core/domain/entities/category';
import { CategoryMapper } from './category.mapper';

describe('CategoryMapper', () => {
  it('round-trips a domain category through the ORM entity', () => {
    const domain = Category.fromPrimitives({
      id: 1,
      name: 'Electronics',
      slug: 'electronics',
      description: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const restored = CategoryMapper.toDomain(CategoryMapper.toEntity(domain));

    expect(restored.id).toBe(1);
    expect(restored.name).toBe('Electronics');
    expect(restored.slug).toBe('electronics');
    expect(restored.isActive).toBe(true);
  });
});
