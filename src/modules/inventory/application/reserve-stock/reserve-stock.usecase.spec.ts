import { ReserveStockUseCase } from './reserve-stock.usecase';

describe('ReserveStockUseCase', () => {
  let usecase: ReserveStockUseCase;

  beforeEach(async () => {
    usecase = new ReserveStockUseCase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });
});
