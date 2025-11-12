import { ListLowStockUseCase } from './list-low-stock.usecase';

describe('ListLowStockUseCase', () => {
  let usecase: ListLowStockUseCase;

  beforeEach(async () => {
    usecase = new ListLowStockUseCase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });
});
