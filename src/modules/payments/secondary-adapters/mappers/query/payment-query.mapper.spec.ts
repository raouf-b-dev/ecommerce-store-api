import { PaymentDtoTestFactory } from 'src/modules/payments/testing';
import { PaymentQueryMapper } from './payment-query.mapper';

describe('PaymentQueryMapper', () => {
  it('should correctly map raw row to PaymentListItemDTO and PaymentDetailDTO', () => {
    const rawRow = PaymentDtoTestFactory.createRawPaymentListQueryRow();

    const listItem = PaymentQueryMapper.toListItemDto(rawRow);
    const detail = PaymentQueryMapper.toDetailDto(rawRow);

    expect(listItem).toEqual({
      id: 1,
      orderId: 100,
      userId: 2,
      userName: 'John Doe',
      userEmail: 'john@example.com',
      amount: 99.99,
      currency: 'USD',
      status: 'COMPLETED',
      paymentMethod: 'CREDIT_CARD',
      transactionId: 'txn_123',
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    expect(listItem).not.toHaveProperty('gatewayPaymentIntentId');

    expect(detail).toEqual({
      ...listItem,
      gatewayPaymentIntentId: 'pi_123',
      failureReason: null,
      metadata: { provider: 'stripe' },
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    expect(Object.keys(detail)).toContain('gatewayPaymentIntentId');
  });

  it('should always include gatewayPaymentIntentId as null when absent', () => {
    const rawRow = PaymentDtoTestFactory.createRawPaymentListQueryRow({
      gatewayPaymentIntentId: null,
    });

    const detail = PaymentQueryMapper.toDetailDto(rawRow);

    expect(detail).toHaveProperty('gatewayPaymentIntentId', null);
  });
});
