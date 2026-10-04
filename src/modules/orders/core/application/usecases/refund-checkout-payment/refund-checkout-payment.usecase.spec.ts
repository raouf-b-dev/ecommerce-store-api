import { RefundCheckoutPaymentUseCase } from './refund-checkout-payment.usecase';
import {
  PaymentGateway,
  ProcessRefundInput,
} from '../../ports/payment.gateway';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ResultAssertionHelper } from '../../../../../../testing';

describe('RefundCheckoutPaymentUseCase', () => {
  let useCase: RefundCheckoutPaymentUseCase;
  let paymentGateway: PaymentGateway;
  let domainEventPublisher: DomainEventPublisher;

  beforeEach(() => {
    paymentGateway = {
      createPaymentIntent: jest.fn(),
      processRefund: jest.fn().mockResolvedValue(Result.success(undefined)),
    };
    domainEventPublisher = { publish: jest.fn() };
    useCase = new RefundCheckoutPaymentUseCase(
      paymentGateway,
      domainEventPublisher,
    );
  });

  it('refunds checkout payment and publishes event on success', async () => {
    const input: ProcessRefundInput = {
      paymentId: 10,
      amount: 50,
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

  it('returns failure when amount is zero', async () => {
    const input: ProcessRefundInput = {
      paymentId: 10,
      amount: 0,
      reason: 'Compensation',
    };

    const result = await useCase.execute(input);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Refund amount must be greater than zero',
    );
    expect(paymentGateway.processRefund).not.toHaveBeenCalled();
    expect(domainEventPublisher.publish).not.toHaveBeenCalled();
  });

  it('returns failure when amount is negative', async () => {
    const input: ProcessRefundInput = {
      paymentId: 10,
      amount: -5,
      reason: 'Compensation',
    };

    const result = await useCase.execute(input);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Refund amount must be greater than zero',
    );
    expect(paymentGateway.processRefund).not.toHaveBeenCalled();
  });

  it('returns failure when gateway fails', async () => {
    jest
      .spyOn(paymentGateway, 'processRefund')
      .mockResolvedValueOnce(
        ErrorFactory.InfrastructureError('Payment provider rejected refund'),
      );

    const input: ProcessRefundInput = {
      paymentId: 10,
      amount: 50,
      reason: 'Compensation',
    };

    const result = await useCase.execute(input);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to refund checkout payment',
    );
    expect(domainEventPublisher.publish).not.toHaveBeenCalled();
  });
});
