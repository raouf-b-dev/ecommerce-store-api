import { BulkCheckStockController } from './bulk-check-stock.controller';

describe('BulkCheckStockController', () => {
  let controller: BulkCheckStockController;

  beforeEach(async () => {
    controller = new BulkCheckStockController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
