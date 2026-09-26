// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { ProductListItemDTO } from './product-list-item.result';

export interface ProductDetailDTO extends ProductListItemDTO {
  description: string | null;
}
