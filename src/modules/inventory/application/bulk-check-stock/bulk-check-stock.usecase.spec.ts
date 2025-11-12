import { BulkCheckStockUseCase } from './bulk-check-stock.usecase';

describe('BulkCheckStockUseCase', () => {
  let usecase: BulkCheckStockUseCase;

  beforeEach(async () => {
    usecase = new BulkCheckStockUseCase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });
});
