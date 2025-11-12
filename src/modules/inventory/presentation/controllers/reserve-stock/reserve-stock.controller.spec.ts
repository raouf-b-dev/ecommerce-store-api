import { ReserveStockUseCase } from '../../../application/reserve-stock/reserve-stock.usecase';
import { ReserveStockController } from './reserve-stock.controller';

describe('ReserveStockController', () => {
  let usecase: jest.Mocked<ReserveStockUseCase>;
  let controller: ReserveStockController;

  beforeEach(async () => {
    usecase = {
      execute: jest.fn(),
    } as any;
    controller = new ReserveStockController(usecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
