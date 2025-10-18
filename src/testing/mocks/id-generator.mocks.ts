// src/testing/mocks/id-generator.mocks.ts

import { IdGeneratorService } from '../../core/infrastructure/orm/id-generator.service';

/**
 * Creates a mock IdGeneratorService with predictable IDs
 */
export function createMockIdGenerator(baseIds?: {
  orderId?: string;
  customerId?: string;
  paymentInfoId?: string;
  shippingAddressId?: string;
}): jest.Mocked<IdGeneratorService> {
  const defaults = {
    orderId: 'OR0000001',
    customerId: 'CUST0000001',
    paymentInfoId: 'PAY0000001',
    shippingAddressId: 'ADDR0000001',
  };

  const ids = { ...defaults, ...baseIds };

  return {
    generateOrderId: jest.fn().mockResolvedValue(ids.orderId),
    generateCustomerId: jest.fn().mockResolvedValue(ids.customerId),
    generatePaymentInfoId: jest.fn().mockResolvedValue(ids.paymentInfoId),
    generateShippingAddressId: jest
      .fn()
      .mockResolvedValue(ids.shippingAddressId),
  } as any;
}
