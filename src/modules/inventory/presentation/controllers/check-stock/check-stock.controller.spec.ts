import { CheckStockController } from './check-stock.controller';

describe('CheckStockController', () => {
  let controller: CheckStockController;

  beforeEach(async () => {
    controller = new CheckStockController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
