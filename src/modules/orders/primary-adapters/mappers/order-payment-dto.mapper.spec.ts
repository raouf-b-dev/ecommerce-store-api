import { OrderDtoTestFactory } from '../../testing';
import { OrderPaymentDtoMapper } from './order-payment-dto.mapper';

describe('OrderPaymentDtoMapper', () => {
  const payment = OrderDtoTestFactory.createCreatedPayment({
    refundedAmount: 500,
  });

  it('maps domain minor units to major-unit decimals', () => {
    const dto = OrderPaymentDtoMapper.toResponse(payment);

    expect(dto.amount).toBe(25.5);
    expect(dto.refundedAmount).toBe(5);
    expect(dto.currency).toBe('EUR');
    expect(dto.id).toBe(5);
  });

  it('keeps a zero payment as zero', () => {
    const dto = OrderPaymentDtoMapper.toResponse({
      ...payment,
      amount: 0,
      refundedAmount: 0,
    });

    expect(dto.amount).toBe(0);
    expect(dto.refundedAmount).toBe(0);
  });
});
