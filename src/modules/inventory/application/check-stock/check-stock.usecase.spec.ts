import { CheckStockUseCase } from './check-stock.usecase';

describe('CheckStockUseCase', () => {
  let usecase: CheckStockUseCase;

  beforeEach(async () => {
    usecase = new CheckStockUseCase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });
});
