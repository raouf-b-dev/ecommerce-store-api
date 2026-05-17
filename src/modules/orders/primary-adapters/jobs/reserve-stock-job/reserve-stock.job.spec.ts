import { Test, TestingModule } from '@nestjs/testing';
import { ReserveStockStep } from './reserve-stock.job';
import { ReserveStockForCheckoutUseCase } from '../../../core/application/usecases/reserve-stock-for-checkout/reserve-stock-for-checkout.usecase';
import { CorrelationService } from '../../../../../infrastructure/logging/correlation/correlation.service';

import { Job } from 'bullmq';
import { ScheduleCheckoutProps } from '../../../core/domain/schedulers/order.scheduler';
import { ScheduleCheckoutPropsFactory } from '../../../testing/factories/schedule-checkout-props.factory';
import { Result } from '../../../../../shared-kernel/domain/result';
import { MockJob } from '../../../../../testing';

describe('ReserveStockStep', () => {
  let jobHandler: ReserveStockStep;
  let reserveStockUseCase: jest.Mocked<ReserveStockForCheckoutUseCase>;

  const mockJob = new MockJob<ScheduleCheckoutProps>(
    ScheduleCheckoutPropsFactory.createMockProps(),
    'reserve-stock',
    'job-123',
  );

  const mockValidateCartResult = {
    cartId: 1,
    cartItems: [
      { productId: 10, quantity: 2, price: 50 },
      { productId: 20, quantity: 1, price: 100 },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReserveStockStep,
        {
          provide: ReserveStockForCheckoutUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: CorrelationService,
          useValue: {
            getId: jest.fn(),
            run: jest.fn((id, fn) => fn()),
          },
        },
      ],
    }).compile();

    jobHandler = module.get<ReserveStockStep>(ReserveStockStep);
    reserveStockUseCase = module.get(ReserveStockForCheckoutUseCase);
  });

  it('should reserve stock', async () => {
    mockJob.getChildrenValues.mockResolvedValue({
      'validate-cart': mockValidateCartResult,
    });

    const reservationId = 555;
    reserveStockUseCase.execute.mockResolvedValue(
      Result.success({ id: reservationId, items: [] }),
    );

    const result = await jobHandler.handle(
      mockJob as unknown as Job<ScheduleCheckoutProps>,
    );

    expect(result).toEqual({
      ...mockValidateCartResult,
      reservationId,
    });

    expect(reserveStockUseCase.execute).toHaveBeenCalledWith({
      orderId: mockJob.data.orderId,
      items: [
        { productId: 10, quantity: 2 },
        { productId: 20, quantity: 1 },
      ],
    });
  });
});
