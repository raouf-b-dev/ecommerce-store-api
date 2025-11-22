import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { PostgresPaymentRepository } from './postgres.payment-repository';
import { PaymentEntity } from '../../orm/payment.schema';
import { RefundEntity } from '../../orm/refund.schema';
import { IdGeneratorService } from '../../../../../core/infrastructure/orm/id-generator.service';
import { createMockIdGenerator } from '../../../../../testing/mocks/id-generator.mocks';
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
  let mockIdGenerator: jest.Mocked<IdGeneratorService>;
  let mockTransactionManager: any;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<PaymentEntity>>;

  beforeEach(async () => {
    mockQueryBuilder = createMockQueryBuilder<PaymentEntity>();
    mockTransactionManager = createMockTransactionManager({ mockQueryBuilder });
    mockDataSource = createMockDataSource(mockTransactionManager) as any;
    mockIdGenerator = createMockIdGenerator({
      paymentId: 'new-pay-123',
      refundId: 'new-ref-123',
    });

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
        {
          provide: IdGeneratorService,
          useValue: mockIdGenerator,
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
      const paymentProps = PaymentTestFactory.createMockPayment();
      const payment = Payment.fromPrimitives(paymentProps);
      const entityToSave = PaymentMapper.toEntity(payment);
      entityToSave.id = 'new-pay-123';

      mockTransactionManager.findOne.mockResolvedValue(null); // No existing payment
      mockTransactionManager.save.mockResolvedValue(entityToSave);

      const result = await repository.save(payment);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockIdGenerator.generatePaymentId).toHaveBeenCalled();
      expect(mockTransactionManager.save).toHaveBeenCalledWith(
        PaymentEntity,
        expect.objectContaining({ id: 'new-pay-123' }),
      );
      expect(result.value.id).toBe('new-pay-123');
    });

    it('should fail if payment already exists', async () => {
      const paymentProps = PaymentTestFactory.createMockPayment();
      const payment = Payment.fromPrimitives(paymentProps);
      const existingEntity = PaymentEntityTestFactory.createPaymentEntity({
        id: 'new-pay-123',
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
      const refundProps = RefundTestFactory.createMockRefund();
      const refund = Refund.fromPrimitives(refundProps);
      const entityToSave = RefundMapper.toEntity(refund);
      entityToSave.id = 'new-ref-123';

      mockTransactionManager.findOne.mockResolvedValue(null); // No existing refund
      mockTransactionManager.save.mockResolvedValue(entityToSave);

      const result = await repository.saveRefund(refund);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockIdGenerator.generateRefundId).toHaveBeenCalled();
      expect(mockTransactionManager.save).toHaveBeenCalledWith(
        RefundEntity,
        expect.objectContaining({ id: 'new-ref-123' }),
      );
      expect(result.value.id).toBe('new-ref-123');
    });

    it('should fail if refund already exists', async () => {
      const refundProps = RefundTestFactory.createMockRefund();
      const refund = Refund.fromPrimitives(refundProps);
      const existingEntity = RefundEntityTestFactory.createRefundEntity({
        id: 'new-ref-123',
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

      const result = await repository.findById('not-found');

      ResultAssertionHelper.assertResultFailure(
        result,
        'Payment not found',
        RepositoryError,
      );
    });

    it('should return a RepositoryError on database error', async () => {
      const dbError = new Error('DB Error');
      mockOrmRepo.findOne.mockRejectedValue(dbError);

      const result = await repository.findById('any-id');

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find payment',
        RepositoryError,
        dbError,
      );
    });
  });
});
