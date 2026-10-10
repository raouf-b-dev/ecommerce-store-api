import { Test, TestingModule } from '@nestjs/testing';
import { HandlePaymentCompletedUseCase } from './handle-payment-completed.usecase';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderScheduler } from '../../../domain/schedulers/order.scheduler';
import { OrderStatus } from '../../../domain/value-objects/order-status';
import { RepositoryError } from '../../../../../../shared-kernel/domain/exceptions/repository.error';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ResultAssertionHelper } from '../../../../../../testing';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import {
  MockOrderRepository,
  MockOrderScheduler,
  OrderTestFactory,
} from 'src/modules/orders/testing';

describe('HandlePaymentCompletedUseCase', () => {
  let useCase: HandlePaymentCompletedUseCase;
  let mockRepository: MockOrderRepository;
  let mockOrderScheduler: MockOrderScheduler;

  const orderId = 1;
  const paymentId = 100;
  const reservationId = 200;
  const cartId = 300;

  beforeEach(async () => {
    mockRepository = new MockOrderRepository();
    mockOrderScheduler = new MockOrderScheduler();
    mockOrderScheduler.schedulePostPayment.mockResolvedValue(
      Result.success('post-payment-job-id'),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandlePaymentCompletedUseCase,
        { provide: OrderRepository, useValue: mockRepository },
        { provide: OrderScheduler, useValue: mockOrderScheduler },
      ],
    }).compile();

    useCase = module.get(HandlePaymentCompletedUseCase);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  it('confirms the order, saves it, and schedules post-payment when payment completes', async () => {
    const orderPrimitives = OrderTestFactory.createPendingPaymentOrder({
      id: orderId,
    });
    mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);
    mockRepository.mockSuccessfulSave();

    const result = await useCase.execute({
      orderId,
      paymentId,
      reservationId,
      cartId,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      orderId,
      status: OrderStatus.CONFIRMED,
    });
    expect(mockRepository.findByIdForUpdate).toHaveBeenCalledWith(orderId);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(mockOrderScheduler.schedulePostPayment).toHaveBeenCalledWith(
      orderId,
      reservationId,
      cartId,
    );
  });

  it('returns a retryable failure and schedules nothing when save fails', async () => {
    const orderPrimitives = OrderTestFactory.createPendingPaymentOrder({
      id: orderId,
    });
    mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);
    mockRepository.mockSaveFailure('Database save failed');

    const result = await useCase.execute({
      orderId,
      paymentId,
      reservationId,
      cartId,
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Database save failed',
      RepositoryError,
    );
    expect(result.error.retryable).toBe(true);
    expect(mockOrderScheduler.schedulePostPayment).not.toHaveBeenCalled();
  });

  it('skips save and scheduling when order is already confirmed', async () => {
    const orderPrimitives = OrderTestFactory.createMockOrder({
      id: orderId,
      status: OrderStatus.CONFIRMED,
      paymentId,
    });
    mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);

    const result = await useCase.execute({
      orderId,
      paymentId,
      reservationId,
      cartId,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      orderId,
      status: OrderStatus.CONFIRMED,
    });
    expect(mockRepository.save).not.toHaveBeenCalled();
    expect(mockOrderScheduler.schedulePostPayment).not.toHaveBeenCalled();
  });

  it('returns failure when order is not found', async () => {
    mockRepository.mockOrderNotFound(orderId);

    const result = await useCase.execute({
      orderId,
      paymentId,
      reservationId,
      cartId,
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      `Order not found: ${orderId}`,
      UseCaseError,
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
    expect(mockOrderScheduler.schedulePostPayment).not.toHaveBeenCalled();
  });

  it('returns failure when confirmPayment domain method fails', async () => {
    const orderPrimitives = OrderTestFactory.createMockOrder({
      id: orderId,
      status: OrderStatus.CANCELLED,
    });
    mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);

    const result = await useCase.execute({
      orderId,
      paymentId,
      reservationId,
      cartId,
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      `Failed to confirm payment for order ${orderId}`,
      UseCaseError,
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
    expect(mockOrderScheduler.schedulePostPayment).not.toHaveBeenCalled();
  });

  it('confirms order without scheduling post-payment when reservationId or cartId are omitted', async () => {
    const orderPrimitives = OrderTestFactory.createPendingPaymentOrder({
      id: orderId,
    });
    mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);
    mockRepository.mockSuccessfulSave();

    const result = await useCase.execute({
      orderId,
      paymentId,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      orderId,
      status: OrderStatus.CONFIRMED,
    });
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(mockOrderScheduler.schedulePostPayment).not.toHaveBeenCalled();
  });

  it('logs error but returns success when schedulePostPayment fails after successful save', async () => {
    const orderPrimitives = OrderTestFactory.createPendingPaymentOrder({
      id: orderId,
    });
    mockRepository.mockSuccessfulFindByIdForUpdate(orderPrimitives);
    mockRepository.mockSuccessfulSave();
    mockOrderScheduler.schedulePostPayment.mockResolvedValue(
      ErrorFactory.InfrastructureError('Queue service unavailable'),
    );

    const result = await useCase.execute({
      orderId,
      paymentId,
      reservationId,
      cartId,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      orderId,
      status: OrderStatus.CONFIRMED,
    });
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(mockOrderScheduler.schedulePostPayment).toHaveBeenCalledWith(
      orderId,
      reservationId,
      cartId,
    );
  });
});
