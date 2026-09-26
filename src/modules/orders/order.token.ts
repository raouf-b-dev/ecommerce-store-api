// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

export const POSTGRES_ORDER_REPOSITORY = Symbol('POSTGRES_ORDER_REPOSITORY');
export const CACHED_ORDER_REPOSITORY = Symbol('CACHED_ORDER_REPOSITORY');
export const USER_GATEWAY = Symbol('USER_GATEWAY');
export const CART_GATEWAY = Symbol('CART_GATEWAY');
export const INVENTORY_RESERVATION_GATEWAY = Symbol(
  'INVENTORY_RESERVATION_GATEWAY',
);
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
export const ORDER_QUERY_SERVICE = Symbol('ORDER_QUERY_SERVICE');
