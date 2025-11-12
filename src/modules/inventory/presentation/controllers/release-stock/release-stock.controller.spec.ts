import { ReleaseStockUseCase } from '../../../application/release-stock/release-stock.usecase';
import { ReleaseStockController } from './release-stock.controller';

describe('ReleaseStockController', () => {
  let usecase: jest.Mocked<ReleaseStockUseCase>;
  let controller: ReleaseStockController;

  beforeEach(async () => {
    usecase = {
      execute: jest.fn(),
    } as any;
    controller = new ReleaseStockController(usecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
