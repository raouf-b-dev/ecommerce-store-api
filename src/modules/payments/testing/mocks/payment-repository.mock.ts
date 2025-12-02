import { PaymentRepository } from '../../domain/repositories/payment.repository';
import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { Payment } from '../../domain/entities/payment';
import { Refund } from '../../domain/entities/refund';
import { IPayment } from '../../domain/interfaces/payment.interface';

export class MockPaymentRepository implements PaymentRepository {
  findById = jest.fn<Promise<Result<Payment, RepositoryError>>, [string]>();
  findByOrderId = jest.fn<
    Promise<Result<Payment[], RepositoryError>>,
    [string]
  >();
  findByTransactionId = jest.fn<
    Promise<Result<Payment, RepositoryError>>,
    [string]
  >();
  findByCustomerId = jest.fn<
    Promise<Result<Payment[], RepositoryError>>,
    [string, number?, number?]
  >();
  save = jest.fn<Promise<Result<Payment, RepositoryError>>, [Payment]>();
  update = jest.fn<Promise<Result<Payment, RepositoryError>>, [Payment]>();
  delete = jest.fn<Promise<Result<void, RepositoryError>>, [string]>();
  findRefundById = jest.fn<
    Promise<Result<Refund, RepositoryError>>,
    [string]
  >();
  saveRefund = jest.fn<Promise<Result<Refund, RepositoryError>>, [Refund]>();

  mockSuccessfulFindById(paymentPrimitives: IPayment): void {
    const domainPayment = Payment.fromPrimitives(paymentPrimitives);
    this.findById.mockResolvedValue(Result.success(domainPayment));
  }

  mockPaymentNotFound(id: string): void {
    this.findById.mockResolvedValue(
      Result.failure(new RepositoryError(`Payment with id ${id} not found`)),
    );
  }

  mockSuccessfulFindByOrderId(paymentsPrimitives: IPayment[]): void {
    const domainPayments = paymentsPrimitives.map((p) =>
      Payment.fromPrimitives(p),
    );
    this.findByOrderId.mockResolvedValue(Result.success(domainPayments));
  }

  mockSuccessfulSave(payment: Payment): void {
    this.save.mockResolvedValue(Result.success(payment));
  }

  mockSaveFailure(errorMessage: string): void {
    this.save.mockResolvedValue(
      Result.failure(new RepositoryError(errorMessage)),
    );
  }

  mockSuccessfulSaveRefund(refund: Refund): void {
    this.saveRefund.mockResolvedValue(Result.success(refund));
  }

  mockSuccessfulUpdate(payment: Payment): void {
    this.update.mockResolvedValue(Result.success(payment));
  }

  mockSuccessfulDelete(): void {
    this.delete.mockResolvedValue(Result.success(undefined));
  }

  reset(): void {
    jest.clearAllMocks();
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.save).not.toHaveBeenCalled();
    expect(this.update).not.toHaveBeenCalled();
    expect(this.delete).not.toHaveBeenCalled();
    expect(this.findRefundById).not.toHaveBeenCalled();
    expect(this.saveRefund).not.toHaveBeenCalled();
    expect(this.findById).not.toHaveBeenCalled();
    expect(this.findByOrderId).not.toHaveBeenCalled();
    expect(this.findByCustomerId).not.toHaveBeenCalled();
  }
}
