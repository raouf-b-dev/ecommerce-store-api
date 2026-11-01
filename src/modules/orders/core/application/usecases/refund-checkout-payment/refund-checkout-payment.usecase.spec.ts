import { RefundCheckoutPaymentUseCase } from './refund-checkout-payment.usecase';
import { RefundPaymentCommand } from '../../commands/refund-payment.command';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { Money } from '../../../../../../shared-kernel/domain/value-objects/money';
import { ResultAssertionHelper } from '../../../../../../testing';
import { MockOrdersPaymentGateway } from '../../../../testing';

describe('RefundCheckoutPaymentUseCase', () => {
  let useCase: RefundCheckoutPaymentUseCase;
  let paymentGateway: MockOrdersPaymentGateway;
  let domainEventPublisher: DomainEventPublisher;

  beforeEach(() => {
    paymentGateway = new MockOrdersPaymentGateway();
    paymentGateway.mockSuccessfulProcessRefund();
    domainEventPublisher = { publish: jest.fn() };
    useCase = new RefundCheckoutPaymentUseCase(
      paymentGateway,
      domainEventPublisher,
    );
  });

  it('refunds checkout payment and publishes event on success', async () => {
    const amountResult = Money.create(5000, 'USD');
    ResultAssertionHelper.assertResultSuccess(amountResult);
    const input: RefundPaymentCommand = {
      paymentId: 10,
      amount: amountResult.value,
      reason: 'Compensation',
    };

    const result = await useCase.execute(input);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(paymentGateway.processRefund).toHaveBeenCalledWith(input);
    expect(domainEventPublisher.publish).toHaveBeenCalledWith(
      'checkout.saga.compensation',
      {
        step: 'refund-payment',
        paymentId: 10,
      },
    );
  });

  it('accepts remaining mode and forwards it to the gateway', async () => {
    const input: RefundPaymentCommand = {
      paymentId: 10,
      mode: 'remaining',
      reason: 'Surplus payment refund',
    };

    const result = await useCase.execute(input);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(paymentGateway.processRefund).toHaveBeenCalledWith(input);
    expect(domainEventPublisher.publish).toHaveBeenCalledWith(
      'checkout.saga.compensation',
      {
        step: 'refund-payment',
        paymentId: 10,
      },
    );
  });

  it('returns failure keeping retryable === true when gateway fails with retryable error', async () => {
    paymentGateway.processRefund.mockResolvedValueOnce(
      ErrorFactory.InfrastructureError('Payment provider timeout', {
        retryable: true,
      }),
    );

    const amountResult = Money.create(5000, 'USD');
    ResultAssertionHelper.assertResultSuccess(amountResult);
    const input: RefundPaymentCommand = {
      paymentId: 10,
      amount: amountResult.value,
      reason: 'Compensation',
    };

    const result = await useCase.execute(input);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to refund checkout payment',
    );
    expect(result).toMatchObject({
      isFailure: true,
      error: { retryable: true },
    });
    expect(domainEventPublisher.publish).not.toHaveBeenCalled();
  });

  it('returns failure keeping retryable === false when gateway fails with non-retryable error', async () => {
    paymentGateway.processRefund.mockResolvedValueOnce(
      ErrorFactory.InfrastructureError('Payment provider rejected refund', {
        retryable: false,
      }),
    );

    const amountResult = Money.create(5000, 'USD');
    ResultAssertionHelper.assertResultSuccess(amountResult);
    const input: RefundPaymentCommand = {
      paymentId: 10,
      amount: amountResult.value,
      reason: 'Compensation',
    };

    const result = await useCase.execute(input);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to refund checkout payment',
    );
    expect(result).toMatchObject({
      isFailure: true,
      error: { retryable: false },
    });
    expect(domainEventPublisher.publish).not.toHaveBeenCalled();
  });
});
