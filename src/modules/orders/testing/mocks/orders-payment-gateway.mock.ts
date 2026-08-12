import { Result } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from 'src/shared-kernel/domain/exceptions/infrastructure-error';
import {
  CreatePaymentIntentInput,
  PaymentGateway,
  PaymentIntentResult,
  ProcessRefundInput,
} from '../../core/application/ports/payment.gateway';

export class MockOrdersPaymentGateway implements PaymentGateway {
  createPaymentIntent = jest.fn<
    Promise<Result<PaymentIntentResult, InfrastructureError>>,
    [CreatePaymentIntentInput]
  >();

  processRefund = jest.fn<
    Promise<Result<void, InfrastructureError>>,
    [ProcessRefundInput]
  >();

  mockSuccessfulCreatePaymentIntent(result: PaymentIntentResult): void {
    this.createPaymentIntent.mockResolvedValue(Result.success(result));
  }

  mockCreatePaymentIntentError(error: InfrastructureError): void {
    this.createPaymentIntent.mockResolvedValue(Result.failure(error));
  }

  mockSuccessfulProcessRefund(): void {
    this.processRefund.mockResolvedValue(Result.success(undefined));
  }

  mockProcessRefundError(error: InfrastructureError): void {
    this.processRefund.mockResolvedValue(Result.failure(error));
  }

  reset(): void {
    jest.clearAllMocks();
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.createPaymentIntent).not.toHaveBeenCalled();
    expect(this.processRefund).not.toHaveBeenCalled();
  }
}
