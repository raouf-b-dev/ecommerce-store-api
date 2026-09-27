// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import { ProductListItemDTO } from './product-list-item.result';

export interface ProductDetailDTO extends ProductListItemDTO {
  description: string | null;
}
