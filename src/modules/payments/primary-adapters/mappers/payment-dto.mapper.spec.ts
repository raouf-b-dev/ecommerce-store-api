import { PaymentTestFactory } from '../../testing';
import { PaymentDtoMapper } from './payment-dto.mapper';
import { ErrorCode } from '../../../../shared-kernel/domain/exceptions/error-code';
import { UseCaseError } from '../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../testing';

describe('PaymentDtoMapper', () => {
  it('maps domain minor units to major-unit decimals across currencies', () => {
    const usdPayment = PaymentTestFactory.createMockPayment({
      amount: 1999,
      refundedAmount: 500,
      currency: 'USD',
    });
    const usdDto = PaymentDtoMapper.toResponse(usdPayment);
    expect(usdDto.amount).toBe(19.99);
    expect(usdDto.refundedAmount).toBe(5);

    const jpyPayment = PaymentTestFactory.createMockPayment({
      amount: 1000,
      refundedAmount: 0,
      currency: 'JPY',
    });
    const jpyDto = PaymentDtoMapper.toResponse(jpyPayment);
    expect(jpyDto.amount).toBe(1000);
    expect(jpyDto.refundedAmount).toBe(0);

    const kwdPayment = PaymentTestFactory.createMockPayment({
      amount: 1234,
      refundedAmount: 500,
      currency: 'KWD',
    });
    const kwdDto = PaymentDtoMapper.toResponse(kwdPayment);
    expect(kwdDto.amount).toBe(1.234);
    expect(kwdDto.refundedAmount).toBe(0.5);
  });

  it('converts a refund request from major units to refund command', () => {
    const command = PaymentDtoMapper.toRefundCommand(7, {
      amount: 19.99,
      reason: 'damaged',
    });

    ResultAssertionHelper.assertResultSuccess(command);
    expect(command.value).toEqual({
      paymentId: 7,
      amount: 19.99,
      reason: 'damaged',
    });
  });

  it('rejects a refund amount that is not a positive number', () => {
    const nanCommand = PaymentDtoMapper.toRefundCommand(7, {
      amount: Number.NaN,
    });
    ResultAssertionHelper.assertResultFailure(
      nanCommand,
      'Refund amount must be greater than zero',
      UseCaseError,
    );
    expect(nanCommand.error.code).toBe(ErrorCode.REFUND_AMOUNT_INVALID);

    const zeroCommand = PaymentDtoMapper.toRefundCommand(7, {
      amount: 0,
    });
    ResultAssertionHelper.assertResultFailure(
      zeroCommand,
      'Refund amount must be greater than zero',
      UseCaseError,
    );
  });
});
