import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { Payment } from '../../../domain/entities/payment';
import { Refund } from '../../../domain/entities/refund';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { PaymentEntity } from '../../orm/payment.schema';
import { RefundEntity } from '../../orm/refund.schema';
import { PaymentMapper } from '../../persistence/mappers/payment.mapper';
import { RefundMapper } from '../../persistence/mappers/refund.mapper';

@Injectable()
export class PostgresPaymentRepository implements PaymentRepository {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(RefundEntity)
    private readonly refundRepo: Repository<RefundEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: number): Promise<Result<Payment, RepositoryError>> {
    try {
      const entity = await this.paymentRepo.findOne({
        where: { id },
        relations: ['refunds'],
      });

      if (!entity) {
        return ErrorFactory.RepositoryError('Payment not found');
      }

      return Result.success(PaymentMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find payment', error);
    }
  }

  async findByOrderId(
    orderId: number,
  ): Promise<Result<Payment[], RepositoryError>> {
    try {
      const entities = await this.paymentRepo.find({
        where: { orderId },
        relations: ['refunds'],
      });

      return Result.success(entities.map((e) => PaymentMapper.toDomain(e)));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find payments by order ID',
        error,
      );
    }
  }

  async findByTransactionId(
    transactionId: string,
  ): Promise<Result<Payment, RepositoryError>> {
    try {
      const entity = await this.paymentRepo.findOne({
        where: { transactionId },
        relations: ['refunds'],
      });

      if (!entity) {
        return ErrorFactory.RepositoryError('Payment not found');
      }

      return Result.success(PaymentMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find payment by transaction ID',
        error,
      );
    }
  }

  async findByGatewayPaymentIntentId(
    paymentIntentId: string,
  ): Promise<Result<Payment, RepositoryError>> {
    try {
      const entity = await this.paymentRepo.findOne({
        where: { gatewayPaymentIntentId: paymentIntentId },
        relations: ['refunds'],
      });

      if (!entity) {
        return ErrorFactory.RepositoryError(
          `Payment not found for intent: ${paymentIntentId}`,
        );
      }

      return Result.success(PaymentMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find payment by gateway intent ID',
        error,
      );
    }
  }

  async findByCustomerId(
    customerId: number,
    page?: number,
    limit?: number,
  ): Promise<Result<Payment[], RepositoryError>> {
    try {
      const skip = (page || 1) - 1;
      const take = limit || 10;

      const entities = await this.paymentRepo.find({
        where: { customerId },
        relations: ['refunds'],
        skip,
        take,
        order: { createdAt: 'DESC' },
      });

      return Result.success(entities.map((e) => PaymentMapper.toDomain(e)));
    } catch (error) {
      return ErrorFactory.RepositoryError(
        'Failed to find payments by customer ID',
        error,
      );
    }
  }

  async save(payment: Payment): Promise<Result<Payment, RepositoryError>> {
    try {
      const savedPayment = await this.dataSource.transaction(
        async (manager) => {
          const entity = PaymentMapper.toEntity(payment);

          const existing = await manager.findOne(PaymentEntity, {
            where: { id: entity.id },
          });

          if (existing) {
            throw new RepositoryError(
              `Payment with ID ${entity.id} already exists`,
            );
          }

          const saved = await manager.save(PaymentEntity, entity);
          return saved;
        },
      );

      return Result.success(PaymentMapper.toDomain(savedPayment));
    } catch (error) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError('Failed to save payment', error);
    }
  }

  async update(payment: Payment): Promise<Result<Payment, RepositoryError>> {
    try {
      const updatedPayment = await this.dataSource.transaction(
        async (manager) => {
          const entity = PaymentMapper.toEntity(payment);
          const existing = await manager.findOne(PaymentEntity, {
            where: { id: entity.id },
          });

          if (!existing) {
            throw new RepositoryError('Payment not found for update');
          }

          const saved = await manager.save(PaymentEntity, entity);
          return saved;
        },
      );

      return Result.success(PaymentMapper.toDomain(updatedPayment));
    } catch (error) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError('Failed to update payment', error);
    }
  }

  async delete(id: number): Promise<Result<void, RepositoryError>> {
    try {
      const result = await this.paymentRepo.delete(id);
      if (result.affected === 0) {
        return ErrorFactory.RepositoryError('Payment not found for deletion');
      }
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to delete payment', error);
    }
  }

  async findRefundById(
    refundId: number,
  ): Promise<Result<Refund, RepositoryError>> {
    try {
      const entity = await this.refundRepo.findOne({
        where: { id: refundId },
      });

      if (!entity) {
        return ErrorFactory.RepositoryError('Refund not found');
      }

      return Result.success(RefundMapper.toDomain(entity));
    } catch (error) {
      return ErrorFactory.RepositoryError('Failed to find refund', error);
    }
  }

  async saveRefund(refund: Refund): Promise<Result<Refund, RepositoryError>> {
    try {
      const savedRefund = await this.dataSource.transaction(async (manager) => {
        const entity = RefundMapper.toEntity(refund);

        const existing = await manager.findOne(RefundEntity, {
          where: { id: entity.id },
        });

        if (existing) {
          throw new RepositoryError(
            `Refund with ID ${entity.id} already exists`,
          );
        }

        const saved = await manager.save(RefundEntity, entity);
        return saved;
      });

      return Result.success(RefundMapper.toDomain(savedRefund));
    } catch (error) {
      if (error instanceof RepositoryError) return Result.failure(error);
      return ErrorFactory.RepositoryError('Failed to save refund', error);
    }
  }
}
