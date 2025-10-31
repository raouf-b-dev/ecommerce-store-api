import { AdjustStockController } from './adjust-stock.controller';

describe('AdjustStockController', () => {
  let controller: AdjustStockController;

  beforeEach(async () => {
    controller = new AdjustStockController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
