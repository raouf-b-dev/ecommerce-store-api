import { GetInventoryController } from './get-inventory.controller';

describe('GetInventoryController', () => {
  let controller: GetInventoryController;

  beforeEach(async () => {
    controller = new GetInventoryController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
