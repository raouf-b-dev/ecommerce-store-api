import { AddCartItemController } from './add-cart-item.controller';

describe('AddCartItemController', () => {
  let controller: AddCartItemController;

  beforeEach(async () => {
    controller = new AddCartItemController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
