import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutFailureListener } from './checkout-failure.listener';
import { getQueueToken } from '@nestjs/bullmq';
import { QueueEventsService } from '../../../../infrastructure/queue/queue-events.service';
import { CancelOrderUseCase } from '../../core/application/usecases/cancel-order/cancel-order.usecase';
import { ReleaseCheckoutStockUseCase } from '../../core/application/usecases/release-checkout-stock/release-checkout-stock.usecase';
import { RefundCheckoutPaymentUseCase } from '../../core/application/usecases/refund-checkout-payment/refund-checkout-payment.usecase';
import { ClearCheckoutCartUseCase } from '../../core/application/usecases/clear-checkout-cart/clear-checkout-cart.usecase';
import { InventoryReservationGateway } from '../../core/application/ports/inventory-reservation.gateway';

describe('CheckoutFailureListener', () => {
  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutFailureListener,
        { provide: getQueueToken('checkout'), useValue: {} },
        { provide: QueueEventsService, useValue: { onFailed: jest.fn() } },
        { provide: CancelOrderUseCase, useValue: {} },
        { provide: ReleaseCheckoutStockUseCase, useValue: {} },
        { provide: RefundCheckoutPaymentUseCase, useValue: {} },
        { provide: ClearCheckoutCartUseCase, useValue: {} },
        { provide: InventoryReservationGateway, useValue: {} },
      ],
    }).compile();

    const listener = module.get<CheckoutFailureListener>(
      CheckoutFailureListener,
    );
    expect(listener).toBeDefined();
  });
});
