// src/modules/payments/domain/repositories/payment.repository.ts
import { Result } from '../../../../core/domain/result';
import { RepositoryError } from '../../../../core/errors/repository.error';
import { Payment } from '../entities/payment';
import { Refund } from '../entities/refund';

export abstract class PaymentRepository {
  abstract findById(id: string): Promise<Result<Payment, RepositoryError>>;
  abstract findByOrderId(
    orderId: string,
  ): Promise<Result<Payment[], RepositoryError>>;
  abstract findByTransactionId(
    transactionId: string,
  ): Promise<Result<Payment, RepositoryError>>;
  abstract findByCustomerId(
    customerId: string,
    page?: number,
    limit?: number,
  ): Promise<Result<Payment[], RepositoryError>>;
  abstract save(payment: Payment): Promise<Result<Payment, RepositoryError>>;
  abstract update(payment: Payment): Promise<Result<Payment, RepositoryError>>;
  abstract delete(id: string): Promise<Result<void, RepositoryError>>;
  abstract findRefundById(
    refundId: string,
  ): Promise<Result<Refund, RepositoryError>>;
  abstract saveRefund(refund: Refund): Promise<Result<Refund, RepositoryError>>;
}
