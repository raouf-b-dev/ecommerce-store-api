import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { PostgresPaymentRepository } from './postgres.payment-repository';
import { PaymentEntity } from '../../orm/payment.schema';
import { RefundEntity } from '../../orm/refund.schema';
import { Payment } from '../../../domain/entities/payment';
import { Refund } from '../../../domain/entities/refund';
import { PaymentEntityTestFactory } from '../../../testing/factories/payment-entity.test.factory';
import { RefundEntityTestFactory } from '../../../testing/factories/refund-entity.test.factory';
import { PaymentTestFactory } from '../../../testing/factories/payment.test.factory';
import { RefundTestFactory } from '../../../testing/factories/refund.test.factory';
import {
  createMockDataSource,
  createMockQueryBuilder,
  createMockTransactionManager,
} from '../../../../../testing/mocks/typeorm.mocks';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { PaymentMapper } from '../../persistence/mappers/payment.mapper';
import { RefundMapper } from '../../persistence/mappers/refund.mapper';

describe('PostgresPaymentRepository', () => {
  let repository: PostgresPaymentRepository;
  let mockOrmRepo: jest.Mocked<Repository<PaymentEntity>>;
  let mockRefundRepo: jest.Mocked<Repository<RefundEntity>>;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockTransactionManager: any;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<PaymentEntity>>;

  beforeEach(async () => {
    mockQueryBuilder = createMockQueryBuilder<PaymentEntity>();
    mockTransactionManager = createMockTransactionManager({ mockQueryBuilder });
    mockDataSource = createMockDataSource(mockTransactionManager) as any;

    mockOrmRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    mockRefundRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresPaymentRepository,
        {
          provide: getRepositoryToken(PaymentEntity),
          useValue: mockOrmRepo,
        },
        {
          provide: getRepositoryToken(RefundEntity),
          useValue: mockRefundRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    repository = module.get<PostgresPaymentRepository>(
      PostgresPaymentRepository,
    );
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('save', () => {
    it('should save a new payment with generated ID inside transaction', async () => {
      const paymentProps = PaymentTestFactory.createMockPayment({ id: 123 });
      const payment = Payment.fromPrimitives(paymentProps);
      const entityToSave = PaymentMapper.toEntity(payment);

      mockTransactionManager.findOne.mockResolvedValue(null); // No existing payment
      mockTransactionManager.save.mockResolvedValue(entityToSave);

      const result = await repository.save(payment);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockTransactionManager.save).toHaveBeenCalledWith(
        PaymentEntity,
        expect.objectContaining({ id: 123 }),
      );
      expect(result.value.id).toBe(123);
    });

    it('should fail if payment already exists', async () => {
      const paymentProps = PaymentTestFactory.createMockPayment();
      const payment = Payment.fromPrimitives(paymentProps);
      const existingEntity = PaymentEntityTestFactory.createPaymentEntity({
        id: 123,
      });

      mockTransactionManager.findOne.mockResolvedValue(existingEntity); // Existing payment

      const result = await repository.save(payment);

      ResultAssertionHelper.assertResultFailure(
        result,
        'already exists',
        RepositoryError,
      );
    });

    it('should return a RepositoryError on transaction failure', async () => {
      const dbError = new Error('DB Error');
      const paymentProps = PaymentTestFactory.createMockPayment();
      const payment = Payment.fromPrimitives(paymentProps);

      mockDataSource.transaction.mockRejectedValue(dbError);

      const result = await repository.save(payment);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save payment',
        RepositoryError,
        dbError,
      );
    });
  });

  describe('saveRefund', () => {
    it('should save a new refund with generated ID inside transaction', async () => {
      const refundProps = RefundTestFactory.createMockRefund({ id: 123 });
      const refund = Refund.fromPrimitives(refundProps);
      const entityToSave = RefundMapper.toEntity(refund);

      mockTransactionManager.findOne.mockResolvedValue(null); // No existing refund
      mockTransactionManager.save.mockResolvedValue(entityToSave);

      const result = await repository.saveRefund(refund);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockTransactionManager.save).toHaveBeenCalledWith(
        RefundEntity,
        expect.objectContaining({ id: 123 }),
      );
      expect(result.value.id).toBe(123);
    });

    it('should fail if refund already exists', async () => {
      const refundProps = RefundTestFactory.createMockRefund();
      const refund = Refund.fromPrimitives(refundProps);
      const existingEntity = RefundEntityTestFactory.createRefundEntity({
        id: 123,
      });

      mockTransactionManager.findOne.mockResolvedValue(existingEntity);

      const result = await repository.saveRefund(refund);

      ResultAssertionHelper.assertResultFailure(
        result,
        'already exists',
        RepositoryError,
      );
    });
  });

  describe('findById', () => {
    it('should return payment if found', async () => {
      const mockEntity = PaymentEntityTestFactory.createPaymentEntity();
      mockOrmRepo.findOne.mockResolvedValue(mockEntity);

      const result = await repository.findById(mockEntity.id);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(mockEntity.id);
    });

    it('should return error if not found', async () => {
      mockOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById(0);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Payment not found',
        RepositoryError,
      );
    });

    it('should return a RepositoryError on database error', async () => {
      const dbError = new Error('DB Error');
      mockOrmRepo.findOne.mockRejectedValue(dbError);

      const result = await repository.findById(0);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find payment',
        RepositoryError,
        dbError,
      );
    });
  });
});
