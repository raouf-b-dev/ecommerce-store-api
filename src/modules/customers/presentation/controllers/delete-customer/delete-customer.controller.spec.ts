import { DeleteCustomerController } from './delete-customer.controller';

describe('DeleteCustomerController', () => {
  let controller: DeleteCustomerController;

  beforeEach(async () => {
    controller = new DeleteCustomerController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
