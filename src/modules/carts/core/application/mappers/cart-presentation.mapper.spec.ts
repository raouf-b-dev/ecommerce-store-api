// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { CartTestFactory } from 'src/modules/carts/testing';
import { CartPresentationMapper } from './cart-presentation.mapper';

describe('CartPresentationMapper', () => {
  it('maps empty cart with subtotal and shippingCost for API responses', () => {
    const cart = CartTestFactory.createEmptyCart({ id: 7, userId: 3 });
    cart.setId(7);

    const dto = CartPresentationMapper.fromDomain(cart);

    expect(dto.subtotal).toBe(0);
    expect(dto.shippingCost).toBe(0);
    expect(dto.totalAmount).toBe(0);
    expect(dto.items).toEqual([]);
  });
});
