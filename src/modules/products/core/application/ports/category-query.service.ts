// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Result } from '../../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../../shared-kernel/domain/exceptions/query.error';
import { ListCategoriesQuery } from '../queries/list-categories.query';
import { CategoryResult } from '../queries/results/category.result';

export abstract class CategoryQueryService {
  abstract list(
    query?: ListCategoriesQuery,
  ): Promise<Result<CategoryResult[], QueryError>>;

  abstract getById(
    id: number,
  ): Promise<Result<CategoryResult | null, QueryError>>;
}
