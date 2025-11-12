import { CheckStockUseCase } from '../../../application/check-stock/check-stock.usecase';
import { CheckStockController } from './check-stock.controller';

describe('CheckStockController', () => {
  let usecase: jest.Mocked<CheckStockUseCase>;
  let controller: CheckStockController;

  beforeEach(async () => {
    usecase = {
      execute: jest.fn(),
    } as any;
    controller = new CheckStockController(usecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
