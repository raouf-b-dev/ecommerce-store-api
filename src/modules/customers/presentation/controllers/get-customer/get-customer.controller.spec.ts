import { GetCustomerController } from './get-customer.controller';

describe('GetCustomerController', () => {
  let controller: GetCustomerController;

  beforeEach(async () => {
    controller = new GetCustomerController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
