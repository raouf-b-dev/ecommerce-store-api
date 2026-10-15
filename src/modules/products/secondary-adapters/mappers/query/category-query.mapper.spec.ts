import { CategoryQueryMapper } from './category-query.mapper';

describe('CategoryQueryMapper', () => {
  it('maps raw rows to category result', () => {
    const result = CategoryQueryMapper.toResult({
      id: 1,
      name: 'Electronics',
      slug: 'electronics',
      description: null,
      isActive: true,
      productCount: 12,
    });

    expect(result).toEqual({
      id: 1,
      name: 'Electronics',
      slug: 'electronics',
      description: null,
      isActive: true,
      productCount: 12,
    });
  });

  it('treats null/invalid productCount as 0', () => {
    expect(
      CategoryQueryMapper.toResult({
        id: 2,
        name: 'Empty',
        slug: 'empty',
        description: null,
        isActive: true,
        productCount: null,
      }).productCount,
    ).toBe(0);

    expect(
      CategoryQueryMapper.toResult({
        id: 3,
        name: 'Bad',
        slug: 'bad',
        description: null,
        isActive: true,
        productCount: -5,
      }).productCount,
    ).toBe(0);
  });
});
