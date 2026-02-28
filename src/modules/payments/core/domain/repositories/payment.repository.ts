// src/modules/payments/core/domain/repositories/payment.repository.ts
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Payment } from '../entities/payment';
import { Refund } from '../entities/refund';

export abstract class PaymentRepository {
  abstract findById(id: number): Promise<Result<Payment, RepositoryError>>;
  abstract findByOrderId(
    orderId: number,
  ): Promise<Result<Payment[], RepositoryError>>;
  abstract findByTransactionId(
    transactionId: string,
  ): Promise<Result<Payment, RepositoryError>>;
  abstract findByGatewayPaymentIntentId(
    paymentIntentId: string,
  ): Promise<Result<Payment, RepositoryError>>;
  abstract findByCustomerId(
    customerId: number,
    page?: number,
    limit?: number,
  ): Promise<Result<Payment[], RepositoryError>>;
  abstract save(payment: Payment): Promise<Result<Payment, RepositoryError>>;
  abstract update(payment: Payment): Promise<Result<Payment, RepositoryError>>;
  abstract delete(id: number): Promise<Result<void, RepositoryError>>;
  abstract findRefundById(
    refundId: number,
  ): Promise<Result<Refund, RepositoryError>>;
  abstract saveRefund(refund: Refund): Promise<Result<Refund, RepositoryError>>;
}
