import {
  PaymentProvider,
  InitiatePaymentParams,
  InitiatePaymentResult,
  AuthorizeResult,
  ProviderOperationResult,
  RefundParams,
} from '../../core/application/ports/payment-provider';
import { PaymentProviderId } from '../../core/domain/value-objects/payment-provider-id';
import { STRIPE_PAYMENT_PROVIDER_ID } from '../../secondary-adapters/gateways/stripe-provider-id';
import { Result } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { Money } from '../../../../shared-kernel/domain/value-objects/money';

export class MockPaymentProvider implements PaymentProvider {
  readonly id: PaymentProviderId;

  constructor(id: PaymentProviderId = STRIPE_PAYMENT_PROVIDER_ID) {
    this.id = id;
  }

  initiatePayment = jest.fn<
    Promise<Result<InitiatePaymentResult, InfrastructureError>>,
    [InitiatePaymentParams]
  >();

  authorize = jest.fn<
    Promise<Result<AuthorizeResult, InfrastructureError>>,
    [Money, string?]
  >();

  capture = jest.fn<
    Promise<Result<ProviderOperationResult, InfrastructureError>>,
    [string, Money]
  >();

  refund = jest.fn<
    Promise<Result<ProviderOperationResult, InfrastructureError>>,
    [RefundParams]
  >();

  mockSuccessfulInitiatePayment(
    providerReference: string = 'pi_123',
    clientSecret: string = 'pi_123_secret_abc',
  ): void {
    this.initiatePayment.mockResolvedValue(
      Result.success({
        providerReference,
        nextAction: {
          type: 'confirm_on_client',
          clientSecret,
        },
      }),
    );
  }

  mockSuccessfulAuthorize(
    providerReference: string = 'txn_123',
    outcome: 'authorized' | 'captured' = 'authorized',
  ): void {
    this.authorize.mockResolvedValue(
      Result.success({
        outcome,
        providerReference,
      }),
    );
  }

  mockDeclinedAuthorize(failureReason: string = 'Card was declined'): void {
    this.authorize.mockResolvedValue(
      Result.success({
        outcome: 'failed',
        failureReason,
      }),
    );
  }

  mockSuccessfulRefund(): void {
    this.refund.mockImplementation((params: RefundParams) => {
      return Promise.resolve(
        Result.success({
          providerReference: params.providerReference,
        }),
      );
    });
  }

  mockFailedRefund(message: string): void {
    this.refund.mockResolvedValue(ErrorFactory.InfrastructureError(message));
  }

  reset(): void {
    this.initiatePayment.mockClear();
    this.authorize.mockClear();
    this.capture.mockClear();
    this.refund.mockClear();
  }
}
