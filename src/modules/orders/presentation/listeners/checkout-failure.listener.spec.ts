import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutFailureListener } from './checkout-failure.listener';
import { getQueueToken } from '@nestjs/bullmq';
import { QueueEventsService } from '../../../../core/infrastructure/queue/queue-events.service';
import { ReleaseStockUseCase } from '../../../inventory/application/release-stock/release-stock.usecase';
import { CancelOrderUseCase } from '../../application/usecases/cancel-order/cancel-order.usecase';
import { ProcessRefundUseCase } from '../../../payments/application/usecases/process-refund/process-refund.usecase';
import { OrderRepository } from '../../domain/repositories/order-repository';
import { GetOrderReservationsUseCase } from '../../../inventory/application/get-order-reservations/get-order-reservations.usecase';

describe('CheckoutFailureListener', () => {
  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutFailureListener,
        { provide: getQueueToken('checkout'), useValue: {} },
        { provide: QueueEventsService, useValue: { onFailed: jest.fn() } },
        { provide: ReleaseStockUseCase, useValue: {} },
        { provide: CancelOrderUseCase, useValue: {} },
        { provide: ProcessRefundUseCase, useValue: {} },
        { provide: OrderRepository, useValue: {} },
        { provide: GetOrderReservationsUseCase, useValue: {} },
      ],
    }).compile();

    const listener = module.get<CheckoutFailureListener>(
      CheckoutFailureListener,
    );
    expect(listener).toBeDefined();
  });
});
