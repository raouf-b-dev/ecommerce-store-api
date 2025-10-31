import { CreateCartController } from './create-cart.controller';

describe('CreateCartController', () => {
  let controller: CreateCartController;

  beforeEach(async () => {
    controller = new CreateCartController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
