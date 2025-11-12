import { ReleaseStockUseCase } from './release-stock.usecase';

describe('ReleaseStockUseCase', () => {
  let usecase: ReleaseStockUseCase;

  beforeEach(async () => {
    usecase = new ReleaseStockUseCase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });
});
