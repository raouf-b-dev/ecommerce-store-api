import { ListLowStockUseCase } from '../../../application/list-low-stock/list-low-stock.usecase';
import { ListLowStockController } from './list-low-stock.controller';

describe('ListLowStockController', () => {
  let usecase: jest.Mocked<ListLowStockUseCase>;
  let controller: ListLowStockController;

  beforeEach(async () => {
    usecase = {
      execute: jest.fn(),
    } as any;
    controller = new ListLowStockController(usecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
