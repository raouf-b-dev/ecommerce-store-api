import { GetCartController } from './get-cart.controller';

describe('GetCartController', () => {
  let controller: GetCartController;

  beforeEach(async () => {
    controller = new GetCartController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
