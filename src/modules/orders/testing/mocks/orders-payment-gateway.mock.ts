import { Result } from '../../../../shared-kernel/domain/result';
import { AppError } from '../../../../shared-kernel/domain/exceptions/app.error';
import { InfrastructureError } from 'src/shared-kernel/domain/exceptions/infrastructure-error';
import {
  CreatedPayment,
  CreatePaymentInput,
  CreatePaymentIntentInput,
  PaymentGateway,
  PaymentIntentResult,
  ProcessRefundInput,
} from '../../core/application/ports/payment.gateway';

export class MockOrdersPaymentGateway implements PaymentGateway {
  createPayment = jest.fn<
    Promise<Result<CreatedPayment, AppError>>,
    [CreatePaymentInput]
  >();

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
    expect(this.createPayment).not.toHaveBeenCalled();
    expect(this.createPaymentIntent).not.toHaveBeenCalled();
    expect(this.processRefund).not.toHaveBeenCalled();
  }
}
