// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Category } from '../../core/domain/entities/category';
import { CategoryProps } from '../../core/domain/entities/category';

export class CategoryTestFactory {
  static createDomainCategory(overrides?: Partial<CategoryProps>): Category {
    return Category.fromPrimitives({
      id: 1,
      name: 'Electronics',
      slug: 'electronics',
      description: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      ...overrides,
    });
  }
}
