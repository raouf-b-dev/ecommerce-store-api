// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { ListProductsQuery } from '../queries/list-products.query';
import { ProductListItemDTO } from '../queries/results/product-list-item.result';
import { ProductDetailDTO } from '../queries/results/product-detail.result';
import { PaginatedQueryResult } from '../../../../../shared-kernel/domain/interfaces/paginated-query-result.interface';
import { Result } from '../../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../../shared-kernel/domain/exceptions/query.error';

export abstract class ProductQueryService {
  abstract list(
    query: ListProductsQuery,
  ): Promise<Result<PaginatedQueryResult<ProductListItemDTO>, QueryError>>;

  abstract getById(
    id: number,
  ): Promise<Result<ProductDetailDTO | null, QueryError>>;

  abstract getBySlug(
    slug: string,
  ): Promise<Result<ProductDetailDTO | null, QueryError>>;
}
