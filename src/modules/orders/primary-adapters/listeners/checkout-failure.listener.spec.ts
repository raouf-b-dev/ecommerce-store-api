import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutFailureListener } from './checkout-failure.listener';
import { getQueueToken } from '@nestjs/bullmq';
import {
  QueueEventHandler,
  QueueEventsService,
} from '../../../../infrastructure/queue/queue-events.service';
import { CancelOrderUseCase } from '../../core/application/usecases/cancel-order/cancel-order.usecase';
import { ReleaseCheckoutStockUseCase } from '../../core/application/usecases/release-checkout-stock/release-checkout-stock.usecase';
import { InventoryReservationGateway } from '../../core/application/ports/inventory-reservation.gateway';
import { MockInventoryReservationGateway } from 'src/modules/orders/testing';
import { Result } from '../../../../shared-kernel/domain/result';

describe('CheckoutFailureListener', () => {
  let listener: CheckoutFailureListener;
  let onFailedHandler: QueueEventHandler | undefined;
  let onFailed: jest.MockedFunction<QueueEventsService['onFailed']>;
  let cancelExecute: jest.MockedFunction<CancelOrderUseCase['execute']>;
  let releaseExecute: jest.MockedFunction<
    ReleaseCheckoutStockUseCase['execute']
  >;
  let getJob: jest.Mock;
  let inventoryGateway: MockInventoryReservationGateway;

  beforeEach(async () => {
    onFailedHandler = undefined;
    onFailed = jest
      .fn<void, [string, QueueEventHandler]>()
      .mockImplementation((_queue, handler) => {
        onFailedHandler = handler;
      });
    getJob = jest.fn();
    cancelExecute = jest.fn().mockResolvedValue(Result.success(undefined));
    releaseExecute = jest.fn().mockResolvedValue(Result.success(undefined));
    inventoryGateway = new MockInventoryReservationGateway();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutFailureListener,
        {
          provide: getQueueToken('checkout'),
          useValue: { getJob },
        },
        {
          provide: QueueEventsService,
          useValue: { onFailed },
        },
        {
          provide: CancelOrderUseCase,
          useValue: { execute: cancelExecute },
        },
        {
          provide: ReleaseCheckoutStockUseCase,
          useValue: { execute: releaseExecute },
        },
        {
          provide: InventoryReservationGateway,
          useValue: inventoryGateway,
        },
      ],
    }).compile();

    listener = module.get(CheckoutFailureListener);
  });

  it('registers onFailed listener and executes compensation on failure', async () => {
    listener.onModuleInit();

    expect(onFailed).toHaveBeenCalledWith('checkout', expect.any(Function));
    expect(onFailedHandler).toBeDefined();

    getJob.mockResolvedValueOnce({
      id: 'job-1',
      data: {
        orderId: 10,
        reservationId: 20,
      },
    });

    if (onFailedHandler) {
      await onFailedHandler({
        jobId: 'job-1',
        failedReason: 'Payment declined',
      });
    }

    expect(cancelExecute).toHaveBeenCalledWith({
      orderId: 10,
      isSagaCompensation: true,
    });
    expect(releaseExecute).toHaveBeenCalledWith(20);
  });

  it('looks up reservationId from inventoryGateway when missing in job data', async () => {
    listener.onModuleInit();

    expect(onFailedHandler).toBeDefined();

    getJob.mockResolvedValueOnce({
      id: 'job-2',
      data: {
        orderId: 15,
      },
    });

    inventoryGateway.mockSuccessfulGetOrderReservations([{ id: 99 }]);

    if (onFailedHandler) {
      await onFailedHandler({
        jobId: 'job-2',
        failedReason: 'Stock expired',
      });
    }

    expect(inventoryGateway.getOrderReservations).toHaveBeenCalledWith(15);
    expect(cancelExecute).toHaveBeenCalledWith({
      orderId: 15,
      isSagaCompensation: true,
    });
    expect(releaseExecute).toHaveBeenCalledWith(99);
  });
});
