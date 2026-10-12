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

  it('maps zero-decimal JPY amounts correctly', () => {
    const dto = OrderPaymentDtoMapper.toResponse({
      ...payment,
      amount: 1000,
      refundedAmount: 0,
      currency: 'JPY',
    });

    expect(dto.amount).toBe(1000);
    expect(dto.refundedAmount).toBe(0);
    expect(dto.currency).toBe('JPY');
  });

  it('maps three-decimal KWD amounts correctly', () => {
    const dto = OrderPaymentDtoMapper.toResponse({
      ...payment,
      amount: 1234,
      refundedAmount: 500,
      currency: 'KWD',
    });

    expect(dto.amount).toBe(1.234);
    expect(dto.refundedAmount).toBe(0.5);
    expect(dto.currency).toBe('KWD');
  });
});
