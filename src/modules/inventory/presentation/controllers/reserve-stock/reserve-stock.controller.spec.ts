import { ReserveStockController } from './reserve-stock.controller';

describe('ReserveStockController', () => {
  let controller: ReserveStockController;

  beforeEach(async () => {
    controller = new ReserveStockController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
