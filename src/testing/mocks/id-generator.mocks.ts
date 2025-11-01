// src/testing/mocks/id-generator.mocks.ts

import { IdGeneratorService } from '../../core/infrastructure/orm/id-generator.service';

export function createMockIdGenerator(baseIds?: {
  orderId?: string;
  customerId?: string;
  paymentInfoId?: string;
  shippingAddressId?: string;
  productId?: string;
  inventoryId?: string;
}): jest.Mocked<IdGeneratorService> {
  const defaults = {
    orderId: 'OR0000001',
    customerId: 'CU0000001',
    paymentInfoId: 'PA0000001',
    shippingAddressId: 'SA0000001',
    productId: 'PR0000001',
    inventoryId: 'IN0000001',
  };

  const ids = { ...defaults, ...baseIds };

  return {
    generateOrderId: jest.fn().mockResolvedValue(ids.orderId),
    generateCustomerId: jest.fn().mockResolvedValue(ids.customerId),
    generatePaymentInfoId: jest.fn().mockResolvedValue(ids.paymentInfoId),
    generateShippingAddressId: jest
      .fn()
      .mockResolvedValue(ids.shippingAddressId),
    generateInventoryId: jest.fn().mockResolvedValue(ids.inventoryId),
    generateProductId: jest.fn().mockResolvedValue(ids.productId),
  } as any;
}
