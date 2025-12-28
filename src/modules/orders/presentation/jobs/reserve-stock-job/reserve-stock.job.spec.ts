import { Test, TestingModule } from '@nestjs/testing';
import { ReserveStockStep } from './reserve-stock.job';
import { ReserveStockUseCase } from '../../../../inventory/application/reserve-stock/reserve-stock.usecase';

describe('ReserveStockStep', () => {
  let jobHandler: ReserveStockStep;
  let reserveStockUseCase: any;

  const mockJob = {
    id: 'job-123',
    name: 'reserve-stock',
    attemptsMade: 0,
    opts: { attempts: 3 },
    data: {
      cartId: 1,
      orderId: 100,
    },
    getChildrenValues: jest.fn(),
  };

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
          provide: ReserveStockUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    jobHandler = module.get<ReserveStockStep>(ReserveStockStep);
    reserveStockUseCase = module.get(ReserveStockUseCase);
  });

  it('should reserve stock', async () => {
    mockJob.getChildrenValues.mockResolvedValue({
      'validate-cart': mockValidateCartResult,
    });

    const reservationId = 555;
    reserveStockUseCase.execute.mockResolvedValue({
      isSuccess: true,
      isFailure: false,
      value: { id: reservationId, items: [] },
    });

    const result = await jobHandler.handle(mockJob as any);

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
