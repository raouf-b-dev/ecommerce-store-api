import { RemoveCartItemController } from './remove-cart-item.controller';

describe('RemoveCartItemController', () => {
  let controller: RemoveCartItemController;

  beforeEach(async () => {
    controller = new RemoveCartItemController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
