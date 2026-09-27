import { IPaymentGateway } from '../../core/domain/gateways/payment-gateway.interface';
import { PaymentGatewayResolver } from '../../core/application/ports/payment-gateway-resolver';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';
import { Result } from '../../../../shared-kernel/domain/result';
import {
  PaymentResult,
  PaymentIntentResult,
} from '../../core/domain/gateways/payment-result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { PaymentStatusType } from '../../core/domain/value-objects/payment-status';

export class MockPaymentGateway implements IPaymentGateway {
  getMethod = jest.fn<PaymentMethodType, []>();
  createPaymentIntent = jest.fn<
    Promise<Result<PaymentIntentResult, InfrastructureError>>,
    [number, string, Record<string, string>?]
  >();
  authorize = jest.fn<
    Promise<Result<PaymentResult, InfrastructureError>>,
    [number, string, string?]
  >();
  capture = jest.fn<
    Promise<Result<PaymentResult, InfrastructureError>>,
    [string]
  >();
  refund = jest.fn<
    Promise<Result<PaymentResult, InfrastructureError>>,
    [string, number]
  >();

  mockSuccessfulAuthorize(transactionId: string = 'txn_123'): void {
    this.authorize.mockResolvedValue(
      Result.success({
        success: true,
        transactionId,
        status: PaymentStatusType.AUTHORIZED,
      }),
    );
  }

  mockSuccessfulRefund(transactionId: string = 'txn_refund_123'): void {
    this.refund.mockResolvedValue(
      Result.success({
        success: true,
        transactionId,
        status: PaymentStatusType.REFUNDED,
      }),
    );
  }

  mockFailedRefund(message: string): void {
    this.refund.mockResolvedValue(ErrorFactory.InfrastructureError(message));
  }

  reset(): void {
    this.getMethod.mockClear();
    this.createPaymentIntent.mockClear();
    this.authorize.mockClear();
    this.capture.mockClear();
    this.refund.mockClear();
  }
}

export class MockPaymentGatewayResolver implements PaymentGatewayResolver {
  getGateway = jest.fn<IPaymentGateway, [PaymentMethodType]>();
  private defaultGateway = new MockPaymentGateway();

  constructor() {
    this.getGateway.mockReturnValue(this.defaultGateway);
  }

  mockGateway(gateway: IPaymentGateway): void {
    this.getGateway.mockReturnValue(gateway);
  }

  getDefaultGateway(): MockPaymentGateway {
    return this.defaultGateway;
  }

  reset(): void {
    this.getGateway.mockClear();
    this.defaultGateway.reset();
    this.getGateway.mockReturnValue(this.defaultGateway);
  }
}
