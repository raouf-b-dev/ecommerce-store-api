import { PaymentTestFactory } from '../../testing';
import { PaymentDtoMapper } from './payment-dto.mapper';
import { ErrorCode } from '../../../../shared-kernel/domain/exceptions/error-code';
import { UseCaseError } from '../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../testing';

describe('PaymentDtoMapper', () => {
  it('maps domain minor units to major-unit decimals', () => {
    const payment = PaymentTestFactory.createMockPayment({
      amount: 1999,
      refundedAmount: 500,
    });

    const dto = PaymentDtoMapper.toResponse(payment);

    expect(dto.amount).toBe(19.99);
    expect(dto.refundedAmount).toBe(5);
  });

  it('converts a refund request from major units to minor units', () => {
    const command = PaymentDtoMapper.toRefundCommand(7, {
      amount: 19.99,
      reason: 'damaged',
    });

    ResultAssertionHelper.assertResultSuccess(command);
    expect(command.value).toEqual({
      paymentId: 7,
      amount: 1999,
      reason: 'damaged',
    });
  });

  it('rejects a refund amount that is not a scale-2 decimal', () => {
    const command = PaymentDtoMapper.toRefundCommand(7, {
      amount: Number.NaN,
    });

    ResultAssertionHelper.assertResultFailure(
      command,
      'Refund amount must be a non-negative scale-2 decimal',
      UseCaseError,
    );
    expect(command.error.code).toBe(ErrorCode.REFUND_AMOUNT_INVALID);
  });
});
