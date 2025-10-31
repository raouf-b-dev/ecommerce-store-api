import { ReleaseStockController } from './release-stock.controller';

describe('ReleaseStockController', () => {
  let controller: ReleaseStockController;

  beforeEach(async () => {
    controller = new ReleaseStockController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
