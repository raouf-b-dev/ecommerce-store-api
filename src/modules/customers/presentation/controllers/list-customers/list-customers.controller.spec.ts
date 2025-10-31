import { ListCustomersController } from './list-customers.controller';

describe('ListCustomersController', () => {
  let controller: ListCustomersController;

  beforeEach(async () => {
    controller = new ListCustomersController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
