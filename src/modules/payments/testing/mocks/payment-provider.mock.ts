import {
  PaymentProvider,
  InitiatePaymentParams,
  InitiatePaymentResult,
  ProviderOperationResult,
  RefundParams,
} from '../../core/application/ports/payment-provider';
import { PaymentProviderResolver } from '../../core/application/ports/payment-provider-resolver';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';
import { Result } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { PaymentStatusType } from '../../core/domain/value-objects/payment-status';
import { Money } from '../../../../shared-kernel/domain/value-objects/money';

export class MockPaymentProvider implements PaymentProvider {
  initiatePayment = jest.fn<
    Promise<Result<InitiatePaymentResult, InfrastructureError>>,
    [InitiatePaymentParams]
  >();

  authorize = jest.fn<
    Promise<Result<ProviderOperationResult, InfrastructureError>>,
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
        status: PaymentStatusType.PENDING,
        nextAction: {
          type: 'confirm_on_client',
          clientSecret,
        },
      }),
    );
  }

  mockSuccessfulAuthorize(providerReference: string = 'txn_123'): void {
    this.authorize.mockResolvedValue(
      Result.success({
        providerReference,
        status: PaymentStatusType.AUTHORIZED,
      }),
    );
  }

  mockSuccessfulRefund(providerReference: string = 'txn_refund_123'): void {
    this.refund.mockImplementation((params: RefundParams) => {
      if (params.amount.amount <= 0) {
        return Promise.resolve(
          ErrorFactory.InfrastructureError(
            'Refund amount must be greater than zero',
          ),
        );
      }
      return Promise.resolve(
        Result.success({
          providerReference: params.providerReference || providerReference,
          status: PaymentStatusType.REFUNDED,
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

export class MockPaymentProviderResolver implements PaymentProviderResolver {
  getProvider = jest.fn<PaymentProvider, [PaymentMethodType]>();
  private defaultProvider = new MockPaymentProvider();

  constructor() {
    this.getProvider.mockReturnValue(this.defaultProvider);
  }

  mockProvider(provider: PaymentProvider): void {
    this.getProvider.mockReturnValue(provider);
  }

  getDefaultProvider(): MockPaymentProvider {
    return this.defaultProvider;
  }

  reset(): void {
    this.getProvider.mockClear();
    this.defaultProvider.reset();
    this.getProvider.mockReturnValue(this.defaultProvider);
  }
}
