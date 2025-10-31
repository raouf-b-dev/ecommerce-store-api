import { UpdateCartItemController } from './update-cart-item.controller';

describe('UpdateCartItemController', () => {
  let controller: UpdateCartItemController;

  beforeEach(async () => {
    controller = new UpdateCartItemController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
