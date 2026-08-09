import { PaymentQueryMapper } from './payment-query.mapper';
import { PaymentDtoTestFactory } from '../../../testing/factories/payment-dto.factory';

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

    expect(detail).toEqual({
      ...listItem,
      failureReason: null,
      metadata: { provider: 'stripe' },
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
  });
});
