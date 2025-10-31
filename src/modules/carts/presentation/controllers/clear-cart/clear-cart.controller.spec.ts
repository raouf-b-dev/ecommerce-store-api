import { ClearCartController } from './clear-cart.controller';

describe('ClearCartController', () => {
  let controller: ClearCartController;

  beforeEach(async () => {
    controller = new ClearCartController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
