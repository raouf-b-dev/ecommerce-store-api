import { ScheduleCheckoutPropsFactory } from 'src/modules/orders/testing';
import { ReserveStockStep } from './reserve-stock.job';
import { ReserveStockForCheckoutUseCase } from '../../../core/application/usecases/reserve-stock-for-checkout/reserve-stock-for-checkout.usecase';
import { CorrelationService } from '../../../../../infrastructure/logging/correlation/correlation.service';
import { Test, TestingModule } from '@nestjs/testing';
import { Result } from '../../../../../shared-kernel/domain/result';
import { createMockJob } from '../../../../../testing';

describe('ReserveStockStep', () => {
  let jobHandler: ReserveStockStep;
  let reserveStockExecute: jest.MockedFunction<
    ReserveStockForCheckoutUseCase['execute']
  >;

  const jobData = ScheduleCheckoutPropsFactory.createMockProps();
  const mockValidateCartResult =
    ScheduleCheckoutPropsFactory.createValidateCartResult();

  beforeEach(async () => {
    reserveStockExecute = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReserveStockStep,
        {
          provide: ReserveStockForCheckoutUseCase,
          useValue: {
            execute: reserveStockExecute,
          },
        },
        {
          provide: CorrelationService,
          useValue: {
            getId: jest.fn(),
            run: jest.fn((_id: string, fn: () => unknown) => fn()),
          },
        },
      ],
    }).compile();

    jobHandler = module.get(ReserveStockStep);
  });

  it('should reserve stock', async () => {
    const mockJob = createMockJob(
      'reserve-stock',
      jobData,
      undefined,
      'job-123',
    );
    jest.spyOn(mockJob, 'getChildrenValues').mockResolvedValue({
      'validate-cart': mockValidateCartResult,
    });

    const reservationId = 555;
    reserveStockExecute.mockResolvedValue(
      Result.success({ id: reservationId, items: [] }),
    );

    const result = await jobHandler.handle(mockJob);

    expect(result).toEqual({
      ...mockValidateCartResult,
      reservationId,
    });

    expect(reserveStockExecute).toHaveBeenCalledWith({
      orderId: mockJob.data.orderId,
      items: [
        { productId: 10, quantity: 2 },
        { productId: 20, quantity: 1 },
      ],
    });
  });
});
