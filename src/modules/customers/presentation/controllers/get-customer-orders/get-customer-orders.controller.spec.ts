import { GetCustomerOrdersController } from './get-customer-orders.controller';

describe('GetCustomerOrdersController', () => {
  let controller: GetCustomerOrdersController;

  beforeEach(async () => {
    controller = new GetCustomerOrdersController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
