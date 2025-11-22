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
import { IdGeneratorService } from '../../../../../core/infrastructure/orm/id-generator.service';

@Injectable()
export class PostgresPaymentRepository implements PaymentRepository {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(RefundEntity)
    private readonly refundRepo: Repository<RefundEntity>,
    private readonly dataSource: DataSource,
    private readonly idGeneratorService: IdGeneratorService,
  ) {}

  async findById(id: string): Promise<Result<Payment, RepositoryError>> {
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
    orderId: string,
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

  async findByCustomerId(
    customerId: string,
    page: number,
    limit: number,
  ): Promise<Result<{ items: Payment[]; total: number }, RepositoryError>> {
    try {
      const [entities, total] = await this.paymentRepo.findAndCount({
        where: { customerId },
        relations: ['refunds'],
        skip: (page - 1) * limit,
        take: limit,
        order: { createdAt: 'DESC' },
      });

      return Result.success({
        items: entities.map((e) => PaymentMapper.toDomain(e)),
        total,
      });
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

          const paymentId = await this.idGeneratorService.generatePaymentId();
          entity.id = paymentId;

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

  async delete(id: string): Promise<Result<void, RepositoryError>> {
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
    refundId: string,
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

        const refundId = await this.idGeneratorService.generateRefundId();
        entity.id = refundId;

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
