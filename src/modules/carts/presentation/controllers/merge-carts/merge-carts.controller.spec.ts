import { MergeCartsController } from './merge-carts.controller';

describe('MergeCartsController', () => {
  let controller: MergeCartsController;

  beforeEach(async () => {
    controller = new MergeCartsController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
