import { BulkCheckStockUseCase } from '../../../application/bulk-check-stock/bulk-check-stock.usecase';
import { BulkCheckStockController } from './bulk-check-stock.controller';

describe('BulkCheckStockController', () => {
  let usecase: jest.Mocked<BulkCheckStockUseCase>;
  let controller: BulkCheckStockController;

  beforeEach(async () => {
    usecase = {
      execute: jest.fn(),
    } as any;
    controller = new BulkCheckStockController(usecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
